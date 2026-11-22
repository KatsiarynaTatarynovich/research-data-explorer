import { useState } from 'react';
import type { Sample } from '../api/samples';
import { MeasurementsPanel } from './MeasurementsPanel';

type SampleItemProps = {
  experimentId: string;
  sample: Sample;
};

export function SampleItem({ experimentId, sample }: SampleItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = `measurements-${sample.id}`;

  return (
    <li className="sample">
      <div className="sample-row">
        <span className="sample-code">{sample.code}</span>
        <button
          type="button"
          className="button secondary small"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`${open ? 'Hide' : 'Show'} measurements for sample ${sample.code}`}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Hide measurements' : 'Measurements'}
        </button>
      </div>

      {open && (
        <MeasurementsPanel
          id={panelId}
          experimentId={experimentId}
          sampleId={sample.id}
          sampleCode={sample.code}
        />
      )}
    </li>
  );
}
