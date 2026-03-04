/**
 * ErrorBoundary — Global crash guard
 * Catches unhandled React rendering errors and shows a recovery UI
 * instead of a blank white page.
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Use inline styles as a safety net — if Tailwind CSS failed to load
      // (which could itself be the cause of a "blank" page), this fallback
      // must still be visible without any CSS framework dependency.
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #111827, #030712)',
            color: '#fff',
            padding: '1rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '28rem', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span
                style={{
                  fontSize: '3.75rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #f87171, #f97316)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  userSelect: 'none',
                }}
              >
                Oops
              </span>
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
              An unexpected error occurred. This has been logged for investigation.
            </p>

            {this.state.error && (
              <details style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <summary
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(252,165,165,0.7)',
                    fontSize: '0.6875rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '8rem',
                    overflow: 'auto',
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(90deg, #14b8a6, #9333ea)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(147,51,234,0.2)',
                }}
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Go to homepage
              </button>
            </div>

            <p style={{ marginTop: '2.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
              Brandtelligence Platform
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}