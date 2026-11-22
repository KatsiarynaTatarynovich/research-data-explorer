CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  UNIQUE(sample_id)
);
