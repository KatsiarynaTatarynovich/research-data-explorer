-- Demo data for Research Data Explorer: 20 experiments with samples and
-- measurements. Every row has a FIXED id, so URLs stay the same between runs.
--
-- Run (from the repo root, after migrations 001–004):
--   pnpm db:seed:demo
-- or:
--   docker compose exec -T db psql -U research -d research_data \
--     -v ON_ERROR_STOP=1 < backend/seeds/demo.sql
--
-- Re-running is safe: it deletes the 20 demo experiments (their samples and
-- measurements go too, via ON DELETE CASCADE) and inserts them fresh.
-- Rows that aren't part of the demo are never touched.
--
-- The whole script is one transaction (BEGIN … COMMIT below): if anything
-- fails, nothing is changed — the old demo rows are never deleted without
-- the new ones being inserted. Don't add psql's --single-transaction flag;
-- the file already manages its own transaction.

BEGIN;
--
-- Id scheme (all valid UUIDs; the digits after the last dash are decimal):
--   experiment  e0000000-0000-4000-a000-0000000000EE            EE = 01..20
--   sample      5a000000-0000-4000-a000-EEEESSSSSSSS   experiment, sample
--   measurement 3e000000-0000-4000-a000-EEESSSTTRRRR   experiment, sample, type, reading
-- e.g. experiment 7 = e0000000-0000-4000-a000-000000000007

-- n          experiment number (1..20), also sets its fixed id and created_at
-- prefix     sample codes become PREFIX-01, PREFIX-02, …
-- readings   readings per measurement type per sample
-- every_h    hours between readings
-- types      what is measured: base value, change per reading, decimals
CREATE TEMP TABLE demo (
  n int PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  prefix text NOT NULL,
  sample_count int NOT NULL,
  readings int NOT NULL,
  every_h int NOT NULL,
  types jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO demo VALUES
(1, 'Soil pH across field plots',
 'Topsoil pH and moisture in five plots of the north field, sampled daily after liming.',
 'PLOT', 5, 3, 24,
 '[{"type":"pH","unit":"pH","base":6.2,"step":0.08,"dp":2},
   {"type":"Moisture","unit":"%","base":18,"step":1.5,"dp":1}]'),
(2, 'Amylase activity vs temperature',
 'Reaction rate of α-amylase measured at increasing incubation temperatures.',
 'ENZ', 4, 4, 6,
 '[{"type":"Temperature","unit":"°C","base":25,"step":5,"dp":1},
   {"type":"Reaction rate","unit":"µmol/min","base":1.2,"step":0.15,"dp":3}]'),
(3, 'E. coli growth curve',
 'Optical density of three E. coli cultures in LB medium at 37 °C, read every two hours.',
 'CULT', 3, 6, 2,
 '[{"type":"OD600","unit":"AU","base":0.05,"step":0.12,"dp":3}]'),
(4, 'River water quality survey',
 'Dissolved oxygen, turbidity and temperature at five sites along the river.',
 'SITE', 5, 3, 24,
 '[{"type":"Dissolved oxygen","unit":"mg/L","base":7.5,"step":0.3,"dp":2},
   {"type":"Turbidity","unit":"NTU","base":4,"step":1.2,"dp":1},
   {"type":"Temperature","unit":"°C","base":12,"step":0.6,"dp":1}]'),
(5, 'Concrete curing strength',
 'Compressive strength of concrete cubes tested after successive curing periods.',
 'CUBE', 4, 4, 48,
 '[{"type":"Compressive strength","unit":"MPa","base":18,"step":3.5,"dp":1}]'),
(6, 'Basil growth under LED spectra',
 'Plant height and leaf chlorophyll index under red, blue and full-spectrum LED light.',
 'POT', 5, 3, 72,
 '[{"type":"Height","unit":"cm","base":4.5,"step":0.8,"dp":1},
   {"type":"Chlorophyll index","unit":"SPAD","base":32,"step":1.4,"dp":1}]'),
(7, 'Li-ion cell cycle ageing',
 'Capacity fade and internal resistance of 18650 cells over repeated charge cycles.',
 'CELL', 3, 5, 12,
 '[{"type":"Capacity","unit":"mAh","base":2500,"step":-12,"dp":0},
   {"type":"Internal resistance","unit":"mΩ","base":45,"step":0.9,"dp":1}]'),
(8, 'Bradford protein assay',
 'Absorbance at 595 nm and derived protein concentration for four lysate dilutions.',
 'PROT', 4, 3, 1,
 '[{"type":"Absorbance 595 nm","unit":"AU","base":0.3,"step":0.07,"dp":3},
   {"type":"Protein concentration","unit":"mg/mL","base":0.4,"step":0.09,"dp":3}]'),
(9, 'Indoor air quality',
 'CO₂ and PM2.5 levels in three meeting rooms during a working day.',
 'ROOM', 3, 4, 2,
 '[{"type":"CO2","unit":"ppm","base":450,"step":60,"dp":0},
   {"type":"PM2.5","unit":"µg/m³","base":8,"step":1.7,"dp":1}]'),
(10, 'Coffee roast profiling',
 'Bean temperature and weight loss for three roast batches of the same green coffee.',
 'ROAST', 3, 4, 1,
 '[{"type":"Bean temperature","unit":"°C","base":180,"step":6,"dp":1},
   {"type":"Weight loss","unit":"%","base":12,"step":0.6,"dp":1}]'),
(11, 'Ale fermentation monitoring',
 'Specific gravity and wort temperature in three fermentation vessels.',
 'BATCH', 3, 5, 24,
 '[{"type":"Specific gravity","unit":"SG","base":1.05,"step":-0.004,"dp":3},
   {"type":"Temperature","unit":"°C","base":20,"step":0.3,"dp":1}]'),
(12, 'Steel bar tensile tests',
 'Yield strength and elongation at break for four reinforcing-bar specimens.',
 'BAR', 4, 2, 4,
 '[{"type":"Yield strength","unit":"MPa","base":350,"step":6,"dp":0},
   {"type":"Elongation","unit":"%","base":22,"step":0.8,"dp":1}]'),
(13, 'Seed germination under salt stress',
 'Germination rate of wheat seeds at four NaCl concentrations.',
 'DISH', 4, 4, 24,
 '[{"type":"Germination rate","unit":"%","base":35,"step":14,"dp":0}]'),
(14, 'Polymer melt viscosity',
 'Viscosity of three polymer blends measured while heating.',
 'POLY', 3, 4, 1,
 '[{"type":"Viscosity","unit":"mPa·s","base":1200,"step":-85,"dp":0},
   {"type":"Temperature","unit":"°C","base":20,"step":10,"dp":1}]'),
(15, 'Groundwater nitrate monitoring',
 'Nitrate concentration in four observation wells near farmland.',
 'WELL', 4, 3, 72,
 '[{"type":"Nitrate","unit":"mg/L","base":22,"step":1.9,"dp":1}]'),
(16, 'Rooftop solar panel efficiency',
 'Module efficiency and plane-of-array irradiance for three panels.',
 'PANEL', 3, 4, 2,
 '[{"type":"Efficiency","unit":"%","base":19.5,"step":-0.2,"dp":2},
   {"type":"Irradiance","unit":"W/m²","base":820,"step":35,"dp":0}]'),
(17, 'Antibiotic disc diffusion',
 'Zone of inhibition around antibiotic discs on four agar plates.',
 'PLATE', 4, 2, 24,
 '[{"type":"Zone diameter","unit":"mm","base":14,"step":1.3,"dp":1}]'),
(18, 'Sourdough starter activity',
 'Rise height and pH of two starters after each feeding.',
 'JAR', 2, 4, 8,
 '[{"type":"Rise","unit":"%","base":40,"step":12,"dp":0},
   {"type":"pH","unit":"pH","base":4.6,"step":-0.08,"dp":2}]'),
(19, 'Beach microplastics survey (planned)',
 'Sediment sampling planned for next month; no samples collected yet.',
 'BEACH', 0, 0, 24,
 '[]'),
(20, 'Thermal camera calibration',
 'Reference targets registered; calibration measurements not taken yet.',
 'CAL', 2, 0, 24,
 '[]');

-- Reset: remove previous demo rows (samples and measurements cascade).
DELETE FROM experiments
WHERE id IN (
  SELECT format('e0000000-0000-4000-a000-%s', lpad(n::text, 12, '0'))::uuid
  FROM demo
);

INSERT INTO experiments (id, name, description, created_at)
SELECT
  format('e0000000-0000-4000-a000-%s', lpad(n::text, 12, '0'))::uuid,
  name,
  description,
  -- One experiment per day from 1 Oct 2026, so the list order is fixed.
  timestamptz '2026-10-01 09:00:00+00' + (n - 1) * interval '1 day'
FROM demo;

INSERT INTO samples (id, experiment_id, code)
SELECT
  format('5a000000-0000-4000-a000-%s%s', lpad(n::text, 4, '0'), lpad(s::text, 8, '0'))::uuid,
  format('e0000000-0000-4000-a000-%s', lpad(n::text, 12, '0'))::uuid,
  format('%s-%s', prefix, lpad(s::text, 2, '0'))
FROM demo, generate_series(1, sample_count) AS s;

-- Values follow a trend (step per reading), differ a little per sample, and
-- get a small deterministic wobble so they look measured, not computed.
-- No random(): every run produces exactly the same numbers.
INSERT INTO measurements (id, sample_id, value, unit, measurement_type, measured_at)
SELECT
  format('3e000000-0000-4000-a000-%s%s%s%s',
         lpad(d.n::text, 3, '0'), lpad(s::text, 3, '0'),
         lpad(t.ord::text, 2, '0'), lpad(r::text, 4, '0'))::uuid,
  format('5a000000-0000-4000-a000-%s%s', lpad(d.n::text, 4, '0'), lpad(s::text, 8, '0'))::uuid,
  round(
    (
      (t.spec->>'base')::numeric
      + (t.spec->>'step')::numeric * (r - 1)
      + (t.spec->>'step')::numeric * 0.4 * (s - 1)
      + (t.spec->>'step')::numeric * 0.3 * (((d.n * 31 + s * 17 + t.ord * 7 + r * 13) % 9) - 4) / 4.0
    ),
    (t.spec->>'dp')::int
  )::double precision,
  t.spec->>'unit',
  t.spec->>'type',
  -- First readings between 2 and 12 Nov 2026; all in the past.
  timestamptz '2026-11-02 08:00:00+00'
    + (d.n - 1) * interval '13 hours'
    + (s - 1) * interval '20 minutes'
    + (r - 1) * d.every_h * interval '1 hour'
FROM demo AS d
CROSS JOIN generate_series(1, d.sample_count) AS s
CROSS JOIN jsonb_array_elements(d.types) WITH ORDINALITY AS t(spec, ord)
CROSS JOIN generate_series(1, d.readings) AS r;

COMMIT;

-- Summary printed by psql after a run.
SELECT
  (SELECT count(*) FROM experiments WHERE id::text LIKE 'e0000000-0000-4000-a000-%') AS demo_experiments,
  (SELECT count(*) FROM samples WHERE id::text LIKE '5a000000-0000-4000-a000-%') AS demo_samples,
  (SELECT count(*) FROM measurements WHERE id::text LIKE '3e000000-0000-4000-a000-%') AS demo_measurements;
