import { useRef, useState, type FormEvent } from 'react';
import { toUserMessage } from '../api/client';
import {
  getInvalidRecords,
  importMeasurementsCsv,
  MAX_IMPORT_FILE_BYTES,
  type ImportSummary,
  type InvalidRecord,
} from '../api/imports';

type ImportCsvFormProps = {
  id: string;
  experimentId: string;
  experimentName: string;
  /** Called after a successful import, so the caller can re-fetch samples. */
  onImported: (summary: ImportSummary) => void;
};

type Failure = { message: string; invalidRecords: InvalidRecord[] };

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

const describeSummary = (summary: ImportSummary, fileName: string): string => {
  const created = summary.samples_created;
  const reused = summary.samples_reused;
  const samples = [
    created > 0 && `${plural(created, 'new sample')}`,
    reused > 0 && `${plural(reused, 'existing sample')}`,
  ]
    .filter(Boolean)
    .join(', ');
  return `Imported ${plural(summary.measurements_imported, 'measurement')} from ${fileName} (${samples}).`;
};

export function ImportCsvForm({
  id,
  experimentId,
  experimentName,
  onImported,
}: ImportCsvFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  // Blocks a second upload if Import is clicked twice quickly.
  const importingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fail = (message: string, invalidRecords: InvalidRecord[] = []) => {
    setFailure({ message, invalidRecords });
    inputRef.current?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (importingRef.current) return;
    setNotice(null);
    setFailure(null);

    // Quick checks the API also makes, to save a pointless upload.
    if (!file) {
      fail('Choose a CSV file to import.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      fail('Only .csv files can be imported.');
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      fail('The file is larger than 1 MB.');
      return;
    }

    importingRef.current = true;
    setIsImporting(true);
    try {
      const summary = await importMeasurementsCsv(experimentId, file);
      setNotice(describeSummary(summary, file.name));
      // Clear the chosen file so the same file isn't imported twice by accident.
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onImported(summary);
    } catch (error) {
      fail(toUserMessage(error), getInvalidRecords(error));
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  };

  const inputId = `${id}-file`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <details className="import">
      <summary>Import measurements from CSV</summary>

      <form
        className="import-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label={`Import measurements into ${experimentName}`}
      >
        <p id={hintId} className="hint">
          One measurement per row. Columns: <code>sample_code</code>,{' '}
          <code>measurement_type</code>, <code>value</code>, <code>unit</code>,
          and optionally <code>measured_at</code> (e.g.{' '}
          <code>2026-11-20T09:15:00Z</code>). Missing samples are created. Up to
          1 MB. If any row is invalid, nothing is imported. Importing the same
          file again adds its measurements again.
        </p>

        <div className="sample-form-row">
          <div className="field">
            <label htmlFor={inputId}>CSV file</label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setFailure(null);
                setNotice(null);
              }}
              aria-invalid={failure ? true : undefined}
              aria-describedby={failure ? `${hintId} ${errorId}` : hintId}
            />
          </div>
          <button type="submit" className="button small" disabled={isImporting}>
            {isImporting ? 'Importing…' : 'Import'}
          </button>
        </div>

        {failure && (
          <div id={errorId} className="alert compact" role="alert">
            <p>
              <strong>Could not import the file.</strong> {failure.message}
            </p>
            {failure.invalidRecords.length > 0 && (
              <div className="table-scroll">
                <table className="measurement-table invalid-records">
                  <caption className="visually-hidden">
                    Invalid rows in the file
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="numeric">
                        Line
                      </th>
                      <th scope="col">Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failure.invalidRecords.map((record) => (
                      <tr key={record.record}>
                        <td className="numeric">{record.line}</td>
                        <td>{record.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <p className="success small-text" role="status">
          {notice}
        </p>
      </form>
    </details>
  );
}
