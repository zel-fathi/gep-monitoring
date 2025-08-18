-- Initial database schema for microgrid energy monitoring

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS energy_data (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  consumption DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_energy_data_timestamp_desc
  ON energy_data (timestamp DESC);
