const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
require('@testing-library/jest-dom');
const { DynamicRenderer } = require('../../components/DynamicRenderer');

// Mock the cognitive load hook
jest.mock('@/hooks/useCognitiveTelemetry', () => ({
  useCognitiveLoadScore: jest.fn()
}));

import { useCognitiveLoadScore } from '@/hooks/useCognitiveTelemetry';

describe('DynamicRenderer', () => {
  const sampleCode = `
    export default function Sample() {
      return <div data-testid="sample">Hello Dynamic</div>;
    }
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders mock UI when mock prop is true', () => {
    render(<DynamicRenderer code="" mock={true} />);
    expect(screen.getByText('Mock Component')).toBeInTheDocument();
  });

  test('does not render when load score below threshold', () => {
    (useCognitiveLoadScore as jest.Mock).mockReturnValue(50); // below default 70
    render(<DynamicRenderer code={sampleCode} />);
    expect(screen.getByText('Waiting for sufficient cognitive load...')).toBeInTheDocument();
  });

  test('renders compiled component when load score above threshold', async () => {
    (useCognitiveLoadScore as jest.Mock).mockReturnValue(80);
    render(<DynamicRenderer code={sampleCode} />);
    // Wait for component to appear
    const rendered = await screen.findByTestId('sample');
    expect(rendered).toHaveTextContent('Hello Dynamic');
  });

  test('shows error fallback when simulated confusion triggers error', () => {
    (useCognitiveLoadScore as jest.Mock).mockReturnValue(80);
    render(<DynamicRenderer code={sampleCode} />);
    const button = screen.getByRole('button', { name: /simulate confusion/i });
    fireEvent.click(button);
    expect(screen.getByText('Failed to render dynamic content.')).toBeInTheDocument();
  });
});
