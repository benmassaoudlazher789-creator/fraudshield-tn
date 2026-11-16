"""
FraudShield TN - job Spark Structured Streaming.
Lit le topic "transactions", score chaque transaction avec XGBoost (+ explications SHAP)
et publie le résultat dans le topic "alerts" (une alerte par transaction).
"""
import json
import logging
import os

import pandas as pd
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (DoubleType, IntegerType, LongType, StringType,
                               StructField, StructType)

from scoring import BLOCK_SCORE, REVIEW_SCORE, FraudScorer

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:29092")
MODEL_DIR = os.getenv("MODEL_DIR", "/models")
TOPIC_IN = os.getenv("TOPIC_TRANSACTIONS", "transactions")
TOPIC_OUT = os.getenv("TOPIC_ALERTS", "alerts")
CHECKPOINT = os.getenv("CHECKPOINT_DIR", "/tmp/checkpoints/fraud-stream")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [fraud-stream] %(levelname)s %(message)s")
log = logging.getLogger("fraud-stream")

# Schéma du TransactionEvent publié par le backend Spring Boot
EVENT_SCHEMA = StructType([
    StructField("transactionId", LongType()),
    StructField("accountId", LongType()),
    StructField("type", StringType()),
    StructField("amount", DoubleType()),
    StructField("oldBalanceOrig", DoubleType()),
    StructField("newBalanceOrig", DoubleType()),
    StructField("oldBalanceDest", DoubleType()),
    StructField("newBalanceDest", DoubleType()),
    StructField("country", StringType()),
    StructField("hour", IntegerType()),
    StructField("timestamp", StringType()),
])
REQUIRED = ["transactionId", "type", "amount", "oldBalanceOrig", "newBalanceOrig",
            "oldBalanceDest", "newBalanceDest", "hour"]

# Modèle chargé une seule fois par processus (cache global)
_scorer = None


def get_scorer() -> FraudScorer:
    global _scorer
    if _scorer is None:
        _scorer = FraudScorer(MODEL_DIR)
        log.info("Modèle chargé : %s (A_VERIFIER >= %d, BLOQUEE >= %d)",
                 _scorer.model_version, REVIEW_SCORE, BLOCK_SCORE)
    return _scorer


def process_batch(batch_df: DataFrame, batch_id: int) -> None:
    """Appelé pour chaque micro-batch : scoring sur le driver puis écriture dans Kafka."""
    pdf: pd.DataFrame = batch_df.toPandas()
    if pdf.empty:
        return

    alerts = get_scorer().score(pdf)

    # Une ligne Kafka par transaction : clé = transactionId, valeur = JSON de l'alerte
    rows = [(str(a["transactionId"]), json.dumps(a, ensure_ascii=False)) for a in alerts]
    out = batch_df.sparkSession.createDataFrame(rows, "key string, value string")
    (out.write.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP)
        .option("topic", TOPIC_OUT)
        .save())

    blocked = sum(a["decision"] == "BLOQUEE" for a in alerts)
    review = sum(a["decision"] == "A_VERIFIER" for a in alerts)
    log.info("Batch %d : %d transaction(s) scorée(s) | BLOQUEE = %d | A_VERIFIER = %d | ACCEPTEE = %d",
             batch_id, len(alerts), blocked, review, len(alerts) - blocked - review)


def main():
    spark = (SparkSession.builder
             .appName("fraudshield-fraud-stream")
             .config("spark.sql.shuffle.partitions", "2")
             .getOrCreate())
    spark.sparkContext.setLogLevel("WARN")

    get_scorer()   # chargement au démarrage : une erreur de modèle est visible tout de suite

    raw = (spark.readStream.format("kafka")
           .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP)
           .option("subscribe", TOPIC_IN)
           .option("startingOffsets", "latest")
           .option("failOnDataLoss", "false")
           .load())

    # from_json renvoie null si le message n'est pas un JSON valide (mode PERMISSIVE)
    parsed = raw.select(F.from_json(F.col("value").cast("string"), EVENT_SCHEMA).alias("e")).select("e.*")

    # Messages invalides ou incomplets (ex : {"test":"bonjour"}) : ignorés sans planter
    valid_cond = None
    for c in REQUIRED:
        cond = F.col(c).isNotNull()
        valid_cond = cond if valid_cond is None else valid_cond & cond
    events = parsed.where(valid_cond)

    query = (events.writeStream
             .foreachBatch(process_batch)
             .option("checkpointLocation", CHECKPOINT)
             .trigger(processingTime="2 seconds")
             .start())

    log.info("Job démarré : %s -> %s (Kafka %s, checkpoint %s)", TOPIC_IN, TOPIC_OUT, KAFKA_BOOTSTRAP, CHECKPOINT)
    query.awaitTermination()


if __name__ == "__main__":
    main()
