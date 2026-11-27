import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DynamicRenderer } from '../DynamicRenderer';
import type { UiMessage } from '@/lib/healUi';
// A real /api/heal-ui reply from the backend in mock mode (field annual_income, score 85).
import reply from './fixtures/healUiReply.json';

const generated = reply.ui as UiMessage;

describe('DynamicRenderer', () => {
  test('renders the mock placeholder when mock is true', () => {
    render(<DynamicRenderer ui={null} mock />);
    expect(screen.getByText('Mock Component')).toBeInTheDocument();
  });

  test('renders nothing when there is no ui message', () => {
    const { container } = render(<DynamicRenderer ui={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('mounts the generated wizard from the backend reply', () => {
    render(<DynamicRenderer ui={generated} />);
    expect(screen.getByTestId('generated-wizard')).toBeInTheDocument();
    expect(screen.getByText('About Gross Annual Operating Income ($)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  test('keeps the value the user typed and submits the edited value', () => {
    const onSubmit = jest.fn();
    render(<DynamicRenderer ui={generated} currentValues={{ annual_income: '72000' }} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const input = screen.getByLabelText('Gross Annual Operating Income ($)');
    // The page's newer value wins over the server's initialValues ("50000").
    expect(input).toHaveValue(72000);

    fireEvent.change(input, { target: { value: '81000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onSubmit).toHaveBeenCalledWith({ annual_income: '81000' });
  });

  test('seeds an empty field from the server initialValues', () => {
    render(<DynamicRenderer ui={generated} currentValues={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Gross Annual Operating Income ($)')).toHaveValue(50000);
  });

  test('shows the static fallback for ui.fallback', () => {
    const ui: UiMessage = { type: 'ui.fallback', sessionId: 's1', targetFieldId: 'tax_id', reason: 'cooldown' };
    render(<DynamicRenderer ui={ui} />);
    expect(screen.getByTestId('heal-fallback')).toHaveTextContent('tax_id');
    expect(screen.getByTestId('heal-fallback')).toHaveTextContent('cooldown');
  });

  test('falls back when the compiled code does not load', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const broken: UiMessage = { ...(generated as any), componentId: 'gen_broken', compiled: 'return 42;' };
    render(<DynamicRenderer ui={broken} />);
    expect(screen.getByTestId('heal-fallback')).toHaveTextContent('load-error');
  });

  test('falls back when the generated component throws while rendering', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const throwing: UiMessage = {
      ...(generated as any),
      componentId: 'gen_throw',
      compiled: 'return function Broken() { return React.createElement(Missing); };',
    };
    render(<DynamicRenderer ui={throwing} />);
    expect(screen.getByTestId('heal-fallback')).toHaveTextContent('render-error');
  });

  test('generated code cannot reach browser globals', () => {
    const probe: UiMessage = {
      ...(generated as any),
      componentId: 'gen_probe',
      // window and fetch are runtime parameters, passed as undefined.
      compiled: 'return function P() { return React.createElement("p", null, String(typeof window) + "/" + String(typeof fetch)); };',
    };
    render(<DynamicRenderer ui={probe} />);
    expect(screen.getByText('undefined/undefined')).toBeInTheDocument();
  });
});
