// Studio controls: tick-mark sliders, brass switches and segmented choices.

import React from 'react';

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export function Slider({label, value, min, max, step, format, onChange}: SliderProps) {
  const id = `tn-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="tn-slider">
      <div className="tn-slider-head">
        <label className="tn-label" htmlFor={id}>{label}</label>
        <span className="tn-value">{format ? format(value) : String(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  note?: string;
};

export function Switch({label, checked, onChange, note}: SwitchProps) {
  return (
    <div>
      <div className="tn-row">
        <span className="tn-label">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className="tn-switch"
          onClick={() => onChange(!checked)}
        />
      </div>
      {note ? <p className="tn-note">{note}</p> : null}
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: readonly {value: T; label: string}[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({label, value, options, onChange}: SegmentedProps<T>) {
  return (
    <div className="tn-slider">
      <div className="tn-slider-head">
        <span className="tn-label">{label}</span>
      </div>
      <div className="tn-segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="tn-section">
      <h3 className="tn-section-title">{title}</h3>
      {children}
    </section>
  );
}
