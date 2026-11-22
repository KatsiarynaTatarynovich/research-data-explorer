import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toUserMessage } from '../api/client';
import {
  createMeasurement,
  fetchMeasurements,
  sortMeasurements,
  type Measurement,
} from '../api/measurements';

type MeasurementsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; measurements: Measurement[] };

type FieldErrors = {
  measurement_type?: string;
  value?: string;
  unit?: string;
  measured_at?: string;
};

type MeasurementsPanelProps = {
  id: string;
  experimentId: string;
  sampleId: string;
  sampleCode: string;
};

// A plain decimal number, optionally with an exponent: 7, -0.5, .25, 1e-3.
// Commas are rejected rather than guessed (is "1,500" 1.5 or 1500?).
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const validate = (
  measurementType: string,
  value: string,
  unit: string,
  measuredAt: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  if (measurementType.trim() === '') errors.measurement_type = 'Enter a type.';

  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    errors.value = 'Enter a value.';
  } else if (trimmedValue.includes(',')) {
    errors.value = 'Use a dot as the decimal separator, e.g. 7.25.';
  } else if (
    !NUMBER_PATTERN.test(trimmedValue) ||
    !Number.isFinite(Number(trimmedValue))
  ) {
    errors.value = 'Enter a number, e.g. 7.25.';
  }

  if (unit.trim() === '') errors.unit = 'Enter a unit.';

  if (measuredAt !== '' && Number.isNaN(new Date(measuredAt).getTime())) {
    errors.measured_at = 'Enter a valid date and time, or leave it empty.';
  }
  return errors;
};

export function MeasurementsPanel({
  id,
  experimentId,
  sampleId,
  sampleCode,
}: MeasurementsPanelProps) {
  const [state, setState] = useState<MeasurementsState>({ status: 'loading' });
  // Bumping this key re-runs the load effect (used by Retry).
  const [loadKey, setLoadKey] = useState(0);

  const [measurementType, setMeasurementType] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [measuredAt, setMeasuredAt] = useState(''); // datetime-local, local time
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const typeRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const measuredAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchMeasurements(experimentId, sampleId, controller.signal)
      .then((measurements) => setState({ status: 'success', measurements }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: toUserMessage(error) });
      });

    return () => controller.abort();
  }, [experimentId, sampleId, loadKey]);

  const reload = () => {
    setState({ status: 'loading' });
    setLoadKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setNotice(null);
    setSubmitError(null);

    const errors = validate(measurementType, value, unit, measuredAt);
    setFieldErrors(errors);
    const firstInvalid = errors.measurement_type
      ? typeRef
      : errors.value
        ? valueRef
        : errors.unit
          ? unitRef
          : errors.measured_at
            ? measuredAtRef
            : null;
    if (firstInvalid) {
      firstInvalid.current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const measurement = await createMeasurement(experimentId, sampleId, {
        measurement_type: measurementType.trim(),
        value: Number(value.trim()),
        unit: unit.trim(),
        // datetime-local has no zone; new Date() reads it as local time and
        // toISOString() sends it as UTC ("…Z"), which the API requires.
        ...(measuredAt !== ''
          ? { measured_at: new Date(measuredAt).toISOString() }
          : {}),
      });

      if (state.status === 'success') {
        setState((previous) =>
          previous.status === 'success'
            ? {
                ...previous,
                measurements: sortMeasurements([
                  ...previous.measurements,
                  measurement,
                ]),
              }
            : previous,
        );
      } else {
        reload();
      }

      // Keep type and unit: the next entry is often the same kind of reading.
      setValue('');
      setMeasuredAt('');
      setNotice(
        `Added ${measurement.measurement_type} ${measurement.value} ${measurement.unit}.`,
      );
      valueRef.current?.focus();
    } catch (error) {
      // Keep the input so the user can fix it and resubmit.
      setSubmitError(toUserMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const knownTypes =
    state.status === 'success'
      ? [...new Set(state.measurements.map((m) => m.measurement_type))]
      : [];
  const knownUnits =
    state.status === 'success'
      ? [...new Set(state.measurements.map((m) => m.unit))]
      : [];

  const fieldId = (name: string) => `${id}-${name}`;
  const errorId = (name: string) => `${id}-${name}-error`;

  return (
    <section
      id={id}
      className="measurements"
      aria-label={`Measurements for sample ${sampleCode}`}
    >
      {state.status === 'loading' && (
        <p className="muted small-text" role="status">
          Loading measurements…
        </p>
      )}

      {state.status === 'error' && (
        <div className="alert compact" role="alert">
          <p>
            <strong>Could not load measurements.</strong> {state.message}
          </p>
          <button
            type="button"
            className="button secondary small"
            onClick={reload}
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && state.measurements.length === 0 && (
        <p className="muted small-text">No measurements yet.</p>
      )}

      {state.status === 'success' && state.measurements.length > 0 && (
        <div className="table-scroll">
          <table className="measurement-table">
            <caption className="visually-hidden">
              Measurements for sample {sampleCode}, oldest first
            </caption>
            <thead>
              <tr>
                <th scope="col">Measured at</th>
                <th scope="col">Type</th>
                <th scope="col" className="numeric">
                  Value
                </th>
                <th scope="col">Unit</th>
              </tr>
            </thead>
            <tbody>
              {state.measurements.map((measurement) => (
                <tr key={measurement.id}>
                  <td>
                    <time dateTime={measurement.measured_at}>
                      {dateTimeFormat.format(new Date(measurement.measured_at))}
                    </time>
                  </td>
                  <td>{measurement.measurement_type}</td>
                  <td className="numeric">{String(measurement.value)}</td>
                  <td>{measurement.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="measurement-form" onSubmit={handleSubmit} noValidate>
        <div className="measurement-fields">
          <div className="field">
            <label htmlFor={fieldId('type')}>Type</label>
            <input
              ref={typeRef}
              id={fieldId('type')}
              type="text"
              autoComplete="off"
              list={knownTypes.length > 0 ? fieldId('types') : undefined}
              placeholder="e.g. pH"
              required
              value={measurementType}
              onChange={(event) => {
                setMeasurementType(event.target.value);
                clearFieldError('measurement_type');
              }}
              aria-invalid={fieldErrors.measurement_type ? true : undefined}
              aria-describedby={
                fieldErrors.measurement_type ? errorId('type') : undefined
              }
            />
            {knownTypes.length > 0 && (
              <datalist id={fieldId('types')}>
                {knownTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            )}
            {fieldErrors.measurement_type && (
              <p id={errorId('type')} className="field-error">
                {fieldErrors.measurement_type}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor={fieldId('value')}>Value</label>
            <input
              ref={valueRef}
              id={fieldId('value')}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 7.25"
              required
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                clearFieldError('value');
              }}
              aria-invalid={fieldErrors.value ? true : undefined}
              aria-describedby={
                fieldErrors.value ? errorId('value') : undefined
              }
            />
            {fieldErrors.value && (
              <p id={errorId('value')} className="field-error">
                {fieldErrors.value}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor={fieldId('unit')}>Unit</label>
            <input
              ref={unitRef}
              id={fieldId('unit')}
              type="text"
              autoComplete="off"
              list={knownUnits.length > 0 ? fieldId('units') : undefined}
              placeholder="e.g. °C"
              required
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value);
                clearFieldError('unit');
              }}
              aria-invalid={fieldErrors.unit ? true : undefined}
              aria-describedby={fieldErrors.unit ? errorId('unit') : undefined}
            />
            {knownUnits.length > 0 && (
              <datalist id={fieldId('units')}>
                {knownUnits.map((knownUnit) => (
                  <option key={knownUnit} value={knownUnit} />
                ))}
              </datalist>
            )}
            {fieldErrors.unit && (
              <p id={errorId('unit')} className="field-error">
                {fieldErrors.unit}
              </p>
            )}
          </div>

          <div className="field full-row">
            <label htmlFor={fieldId('measured-at')}>
              Measured at <span className="optional">(optional)</span>
            </label>
            <input
              ref={measuredAtRef}
              id={fieldId('measured-at')}
              type="datetime-local"
              step={1}
              value={measuredAt}
              onChange={(event) => {
                setMeasuredAt(event.target.value);
                clearFieldError('measured_at');
              }}
              aria-invalid={fieldErrors.measured_at ? true : undefined}
              aria-describedby={[
                fieldId('measured-at-hint'),
                fieldErrors.measured_at ? errorId('measured-at') : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            <p id={fieldId('measured-at-hint')} className="hint">
              Your local time. Leave empty to use the current time.
            </p>
            {fieldErrors.measured_at && (
              <p id={errorId('measured-at')} className="field-error">
                {fieldErrors.measured_at}
              </p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="field-error" role="alert">
            <strong>Could not add the measurement.</strong> {submitError}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="button small"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding…' : 'Add measurement'}
          </button>
          <p className="success small-text" role="status">
            {notice}
          </p>
        </div>
      </form>
    </section>
  );
}
