'use client';

/**
 * Approved components for generated wizards (design system ds-0.1, docs/contracts.md §7).
 *
 * Generated code can only use these names; the AST validator rejects anything else.
 * Field components call onChange with the new value (not the DOM event).
 */

import React from 'react';

type Children = { children?: React.ReactNode };
type FieldBase = { id: string; label: string };

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

function FieldShell({ id, label, help, error, children }: FieldBase & Children & { help?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-slate-500">{help}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

const asText = (v: unknown) => (v === undefined || v === null ? '' : String(v));

// A div, not a <form>: the wizard is shown inside the portal page, whose global styles target
// `main form > div`, and generated code calls onSubmit() from its own Done button anyway.
export function Wizard({ children }: Children & { onSubmit?: () => void }) {
  return (
    <div role="form" aria-label="Guided help" data-testid="generated-wizard" className="flex flex-col gap-4">
      {children}
    </div>
  );
}

export function WizardStep({ title, description, children }: Children & { title: string; description?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
}: FieldBase & { value?: unknown; onChange: (v: string) => void; placeholder?: string; help?: string; error?: string }) {
  return (
    <FieldShell id={id} label={label} help={help} error={error}>
      <input
        id={id}
        type="text"
        className={inputClass}
        value={asText(value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  help,
}: FieldBase & { value?: unknown; onChange: (v: string) => void; min?: number; max?: number; help?: string }) {
  return (
    <FieldShell id={id} label={label} help={help}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={inputClass}
        value={asText(value)}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

type Option = string | { value: string; label?: string };

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: FieldBase & { value?: unknown; onChange: (v: string) => void; options: Option[] }) {
  return (
    <FieldShell id={id} label={label}>
      <select id={id} className={inputClass} value={asText(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(options || []).map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label ?? opt.value}
            </option>
          );
        })}
      </select>
    </FieldShell>
  );
}

export function DateField({ id, label, value, onChange }: FieldBase & { value?: unknown; onChange: (v: string) => void }) {
  return (
    <FieldShell id={id} label={label}>
      <input id={id} type="date" className={inputClass} value={asText(value)} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
}

export function Checkbox({ id, label, checked, onChange }: FieldBase & { checked?: unknown; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-800">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300"
        checked={checked === true || checked === 'true'}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Button({
  variant = 'primary',
  onClick,
  children,
}: Children & { variant?: 'primary' | 'secondary'; onClick?: () => void }) {
  const style =
    variant === 'secondary'
      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      : 'bg-blue-600 text-white hover:bg-blue-700';
  return (
    <button type="button" className={`rounded-lg px-4 py-2 text-sm font-semibold ${style}`} onClick={() => onClick?.()}>
      {children}
    </button>
  );
}

export function HelpText({ children }: Children) {
  return <p className="text-sm text-slate-600">{children}</p>;
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ className, children }: Children & { className?: string }) {
  return <div className={className ?? 'rounded-lg border border-slate-200 p-4'}>{children}</div>;
}

export function Stack({ className, children }: Children & { className?: string }) {
  return <div className={`flex flex-col ${className ?? 'gap-3'}`}>{children}</div>;
}

/** Everything the runtime passes to a generated component, keyed by the names in ai/designSystem.js. */
export const approvedScope = {
  React,
  useState: React.useState,
  useMemo: React.useMemo,
  Wizard,
  WizardStep,
  TextField,
  NumberField,
  SelectField,
  DateField,
  Checkbox,
  Button,
  HelpText,
  ProgressBar,
  Card,
  Stack,
};
