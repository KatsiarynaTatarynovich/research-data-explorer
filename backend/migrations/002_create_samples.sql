CREATE TABLE samples (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id),
  code TEXT NOT NULL,
  UNIQUE (experiment_id, code)
);
