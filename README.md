# Research Data Explorer

Research Data Explorer is a web application for importing, validating, and exploring experimental measurements. The first version will use synthetic protein concentration data to demonstrate the workflow from a raw CSV file to a searchable dataset and a reproducible summary report.

## Planned features

- Create experiments and browse their samples and measurements.
- Import CSV files into an existing experiment.
- Validate required columns, numeric values, and measurement units. Report invalid records with their record number and the reason for rejection.
- Save each import in a single database transaction so a failed import leaves no partial data.
- Run a standalone Python script to calculate the count, mean, and median for each group of measurements with the same type and unit.

## Technology stack

| Component | Technology |
| --- | --- |
| Frontend | React, TypeScript |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Data analysis | Python, pandas |
| Local development | Docker Compose |

## Example input

Each CSV record represents one measurement. The target experiment is selected before upload.

```csv
sample_code,measurement_type,value,unit
S01,protein_concentration,2.4,mg/mL
S02,protein_concentration,3.1,mg/mL
S03,protein_concentration,1.8,mg/mL
```

## Roadmap

1. Build a minimal React screen and an Express API for listing and creating experiments.
2. Add PostgreSQL persistence for experiments, samples, and measurements.
3. Implement CSV validation and transactional imports.
4. Add a standalone Python script that produces a JSON summary.
5. Set up a reproducible local environment with Docker Compose.
6. Extend the import workflow with background processing, job status, and retries that avoid duplicate records.