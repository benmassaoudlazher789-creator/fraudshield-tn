# Image officielle Spark 3.5.9 (Scala 2.12, Java 17, Ubuntu 22.04).
# Elle embarque Python 3.10, or xgboost 3.4.1 et shap 0.54 exigent Python >= 3.12 :
# on installe donc un Python 3.12 dédié (via uv) que PySpark utilisera.
FROM apache/spark:3.5.9-scala2.12-java17-python3-ubuntu

USER root

# setuptools : PySpark 3.5 importe distutils, supprimé en Python 3.12 ; setuptools le fournit
ENV UV_PYTHON_INSTALL_DIR=/opt/python \
    VIRTUAL_ENV=/opt/venv
RUN pip3 install --no-cache-dir uv==0.13.6 \
 && uv venv --python 3.12 /opt/venv \
 && uv pip install --python /opt/venv/bin/python --no-cache \
        pandas==3.1.1 numpy==2.5.4 pyarrow==26.0.1 scikit-learn==1.9.1 \
        xgboost==3.4.1 shap==0.54.1 setuptools==84.2.1

# PySpark (driver et executors) utilise ce Python 3.12
ENV PATH=/opt/venv/bin:$PATH \
    PYSPARK_PYTHON=/opt/venv/bin/python \
    PYSPARK_DRIVER_PYTHON=/opt/venv/bin/python

# Pré-téléchargement du connecteur Kafka au build : pas de téléchargement à chaque démarrage
ENV KAFKA_PACKAGE=org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.9 \
    IVY_DIR=/opt/ivy
RUN mkdir -p /opt/ivy /tmp/checkpoints \
 && echo "print('ok')" > /tmp/warmup.py \
 && /opt/spark/bin/spark-submit --master local[1] --packages $KAFKA_PACKAGE \
        --conf spark.jars.ivy=$IVY_DIR /tmp/warmup.py \
 && rm /tmp/warmup.py \
 && chown -R spark:spark /opt/ivy /tmp/checkpoints

WORKDIR /app
COPY scoring.py fraud_stream.py test_model.py ./

USER spark
