import { useRef, useState, type FormEvent } from 'react';
import {
  createExperiment,
  toUserMessage,
  type Experiment,
} from '../api/experiments';

type FieldErrors = { name?: string; description?: string };

type NewExperimentFormProps = {
  onCreated: (experiment: Experiment) => void;
};

// Mirrors the API rules in backend/src/experiments/experiments.routes.ts:
// both fields are required and must not be blank after trimming.
const validate = (name: string, description: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (name.trim() === '') errors.name = 'Enter a name.';
  if (description.trim() === '') errors.description = 'Enter a description.';
  return errors;
};

export function NewExperimentForm({ onCreated }: NewExperimentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State updates are async, so a fast double-click could submit twice
  // before the button re-renders as disabled. The ref blocks that.
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    setSuccessMessage(null);
    setSubmitError(null);

    const errors = validate(name, description);
    setFieldErrors(errors);
    if (errors.name) {
      nameRef.current?.focus();
      return;
    }
    if (errors.description) {
      descriptionRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const experiment = await createExperiment({
        name: name.trim(),
        description: description.trim(),
      });
      onCreated(experiment);
      setName('');
      setDescription('');
      setSuccessMessage(`Created “${experiment.name}”.`);
    } catch (error) {
      // Keep the user's input so they can fix it and resubmit.
      setSubmitError(toUserMessage(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="new-experiment-heading">
      <h2 id="new-experiment-heading">New experiment</h2>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="experiment-name">Name</label>
          <input
            ref={nameRef}
            id="experiment-name"
            name="name"
            type="text"
            autoComplete="off"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldErrors.name)
                setFieldErrors((e) => ({ ...e, name: undefined }));
            }}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={
              fieldErrors.name ? 'experiment-name-error' : undefined
            }
          />
          {fieldErrors.name && (
            <p id="experiment-name-error" className="field-error">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="experiment-description">Description</label>
          <textarea
            ref={descriptionRef}
            id="experiment-description"
            name="description"
            rows={4}
            required
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              if (fieldErrors.description)
                setFieldErrors((e) => ({ ...e, description: undefined }));
            }}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={
              fieldErrors.description
                ? 'experiment-description-error'
                : undefined
            }
          />
          {fieldErrors.description && (
            <p id="experiment-description-error" className="field-error">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {submitError && (
          <div className="alert" role="alert">
            <p>
              <strong>Could not create the experiment.</strong> {submitError}
            </p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="button"
            disabled={isSubmitting}
            aria-disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create experiment'}
          </button>
          <p className="success" role="status">
            {successMessage}
          </p>
        </div>
      </form>
    </section>
  );
}
