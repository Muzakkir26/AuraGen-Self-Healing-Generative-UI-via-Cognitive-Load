import React, { useState, useEffect, ReactNode } from 'react';
import * as Babel from '@babel/standalone';
import { useCognitiveLoadScore } from '@/hooks/useCognitiveTelemetry';

/**
 * Simple Error Boundary to catch rendering errors from the dynamic component.
 */
class ErrorBoundary extends React.Component<{ fallback: ReactNode }, { hasError: boolean }>
{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('DynamicRenderer error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * DynamicRenderer compiles a raw React code string using @babel/standalone and renders it.
 *
 * Props:
 *  - code: string – raw JSX/TSX code to compile and render.
 *  - mock?: boolean – if true, renders a mock component instead of compiling.
 *  - threshold?: number – Cognitive Load Score threshold to trigger rendering (default 70).
 */
export interface DynamicRendererProps {
  code: string;
  mock?: boolean;
  threshold?: number;
}

export const DynamicRenderer: React.FC<DynamicRendererProps> = ({ code, mock = false, threshold = 70 }) => {
  const [compiledComponent, setCompiledComponent] = useState<ReactNode>(null);
  const [simulateError, setSimulateError] = useState(false);
  const loadScore = useCognitiveLoadScore(); // Assume this returns a number

  // Compile and evaluate the code when needed
  useEffect(() => {
    if (mock) {
      // Render a simple mock UI
      setCompiledComponent(
        <div className="p-4 border rounded bg-gray-100">
          <h3 className="text-lg font-bold">Mock Component</h3>
          <p>This is a placeholder when mock mode is active.</p>
        </div>
      );
      return;
    }

    if (simulateError) {
      // Force an error to test the boundary
      setCompiledComponent(() => {
        throw new Error('Simulated confusion error');
      });
      return;
    }

    // Only render when load score exceeds threshold
    if (loadScore < threshold) {
      setCompiledComponent(null);
      return;
    }

    try {
      // Transform code using React and env presets (CommonJS)
      const transformed = Babel.transform(code, {
        presets: [
        ['react'],
        ['env', { modules: 'commonjs' }]
      ],
        // No additional plugins needed; using env preset with CommonJS modules
      }).code;
      // Prepare a simple CommonJS environment.
      const module = { exports: {} } as any;
      const func = new Function('React', 'module', 'exports', transformed);
      func(React, module, module.exports);
      const Component = module.exports.default || module.exports;
      setCompiledComponent(<Component />);
    } catch (err) {
      console.error('DynamicRenderer compilation error:', err);
      setCompiledComponent(() => {
        throw err;
      });
    }
  }, [code, mock, simulateError, loadScore, threshold]);

  return (
    <div className="dynamic-renderer">
      <button
        type="button"
        className="mb-2 px-3 py-1 bg-red-500 text-white rounded"
        onClick={() => setSimulateError((prev) => !prev)}
      >
        Simulate confusion
      </button>
      <ErrorBoundary fallback={<div className="text-red-600">Failed to render dynamic content.</div>}>
        {compiledComponent || <div className="text-gray-500">Waiting for sufficient cognitive load...</div>}
      </ErrorBoundary>
    </div>
  );
};
