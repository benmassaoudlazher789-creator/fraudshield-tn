CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,          -- CLIENT, ANALYSTE, ADMIN
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id),
    account_ref VARCHAR(34)   NOT NULL UNIQUE,
    bank        VARCHAR(50)   NOT NULL,
    balance     NUMERIC(15,3) NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    account_id        BIGINT        NOT NULL REFERENCES accounts(id),
    beneficiary       VARCHAR(100)  NOT NULL,
    amount            NUMERIC(15,3) NOT NULL,
    type              VARCHAR(20)   NOT NULL,     -- PAYMENT, TRANSFER, CASH_OUT
    country           VARCHAR(2)    NOT NULL,
    old_balance_orig  NUMERIC(15,3) NOT NULL,
    new_balance_orig  NUMERIC(15,3) NOT NULL,
    old_balance_dest  NUMERIC(15,3) NOT NULL,
    new_balance_dest  NUMERIC(15,3) NOT NULL,
    status            VARCHAR(20)   NOT NULL,     -- EN_COURS, ACCEPTEE, A_VERIFIER, BLOQUEE
    risk_score        INTEGER,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
    id               BIGSERIAL PRIMARY KEY,
    transaction_id   BIGINT      NOT NULL UNIQUE REFERENCES transactions(id),
    score            INTEGER     NOT NULL,
    decision         VARCHAR(20) NOT NULL,        -- A_VERIFIER, BLOQUEE
    reasons          TEXT,                        -- explications SHAP (JSON)
    analyst_decision VARCHAR(20),                 -- FRAUDE_CONFIRMEE, FAUX_POSITIF
    analyst_comment  TEXT,
    analyst_id       BIGINT REFERENCES users(id),
    decided_at       TIMESTAMP,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE business_rules (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(50)   NOT NULL UNIQUE,
    label       VARCHAR(200)  NOT NULL,
    threshold   NUMERIC(15,3) NOT NULL,
    enabled     BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_alerts_created       ON alerts(created_at);