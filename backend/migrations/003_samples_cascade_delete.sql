BEGIN;

ALTER TABLE samples
  DROP CONSTRAINT samples_experiment_id_fkey;

ALTER TABLE samples
  ADD CONSTRAINT samples_experiment_id_fkey
  FOREIGN KEY (experiment_id)
  REFERENCES experiments(id)
  ON DELETE CASCADE;

COMMIT;
