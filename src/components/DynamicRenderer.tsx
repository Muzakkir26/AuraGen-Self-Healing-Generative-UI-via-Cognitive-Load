'use client';

/**
 * DynamicRenderer: mounts the wizard the backend generated for the field the user is stuck on.
 *
 * Input is the `ui` message from POST /api/heal-ui (docs/contracts.md §5–6, §9):
 *  - `ui.generated`: `compiled` was already checked by the AST validator on the server.
 *    It is loaded with the shared runtime (ai/runtime/loadComponent.js), which only gives the code
 *    the approved components and hooks, and passes every banned global (window, fetch, ...) as undefined.
 *  - `ui.fallback`, a load error or a render error: a static help panel, so the form keeps working.
 *
 * Values the user already typed are kept: the wizard starts from the page's current values,
 * with the server's `initialValues` filling only empty fields.
 */

import React, { ReactNode, useMemo, useState } from 'react';
import { approvedScope } from '@/components/generated/approvedComponents';
import type { FieldValues, UiMessage } from '@/lib/healUi';
// Shared with the AI layer, so the browser and the server agree on the runtime parameters.
import { loadGeneratedComponent, startingValues, applyChange } from '../../ai/runtime/loadComponent';

export interface DynamicRendererProps {
  ui: UiMessage | null;
  /** Current form values on the page (newer than what the server saw). */
  currentValues?: FieldValues;
  /** Called with the wizard's values when the user finishes it. */
  onSubmit?: (values: FieldValues) => void;
  /** Called when the user closes the wizard or the fallback panel. */
  onDismiss?: () => void;
  /** Show a placeholder instead of the generated code (UI development without the backend). */
  mock?: boolean;
}

class ErrorBoundary extends React.Component<{ fallback: ReactNode; children?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('DynamicRenderer: generated component crashed', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function FallbackPanel({ fieldId, reason, onDismiss }: { fieldId: string; reason: string; onDismiss?: () => void }) {
  return (
    <div role="status" data-testid="heal-fallback" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Need a hand with this field?</p>
      <p className="mt-1">
        Take your time with <code>{fieldId}</code>. The hint under the field explains what to enter, and everything you
        have typed so far is saved.
      </p>
      <p className="mt-1 text-xs text-amber-700">Guided help unavailable ({reason}).</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold">
          Close
        </button>
      )}
    </div>
  );
}

function GeneratedWizard({
  compiled,
  ui,
  currentValues,
  onSubmit,
  onDismiss,
}: {
  compiled: string;
  ui: UiMessage;
  currentValues?: FieldValues;
  onSubmit?: (values: FieldValues) => void;
  onDismiss?: () => void;
}) {
  const loaded = useMemo(() => {
    try {
      return { Component: loadGeneratedComponent(compiled, approvedScope) as React.ComponentType<any>, error: null };
    } catch (err) {
      console.error('DynamicRenderer: could not load generated component', err);
      return { Component: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [compiled]);

  const [values, setValues] = useState<FieldValues>(() => startingValues(ui, currentValues || {}) as FieldValues);

  const fallback = <FallbackPanel fieldId={ui.targetFieldId} reason="render-error" onDismiss={onDismiss} />;
  if (!loaded.Component) return <FallbackPanel fieldId={ui.targetFieldId} reason="load-error" onDismiss={onDismiss} />;
  const Generated = loaded.Component;

  return (
    <ErrorBoundary fallback={fallback}>
      <Generated
        values={values}
        onChange={(fieldId: string, value: FieldValues[string]) => setValues((prev) => applyChange(prev, fieldId, value) as FieldValues)}
        onSubmit={() => onSubmit?.(values)}
      />
    </ErrorBoundary>
  );
}

export function DynamicRenderer({ ui, currentValues, onSubmit, onDismiss, mock = false }: DynamicRendererProps) {
  if (mock) {
    return (
      <div className="rounded border bg-gray-100 p-4">
        <h3 className="text-lg font-bold">Mock Component</h3>
        <p>This is a placeholder when mock mode is active.</p>
      </div>
    );
  }
  if (!ui) return null;

  return (
    <div data-testid="dynamic-renderer" className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
      {ui.type === 'ui.generated' ? (
        // Keyed by componentId so a new wizard starts with fresh state.
        <GeneratedWizard
          key={ui.componentId}
          compiled={ui.compiled}
          ui={ui}
          currentValues={currentValues}
          onSubmit={onSubmit}
          onDismiss={onDismiss}
        />
      ) : (
        <FallbackPanel fieldId={ui.targetFieldId} reason={ui.reason} onDismiss={onDismiss} />
      )}
      {ui.type === 'ui.generated' && onDismiss && (
        <button type="button" onClick={onDismiss} className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-800">
          Close guided help
        </button>
      )}
    </div>
  );
}

export default DynamicRenderer;
