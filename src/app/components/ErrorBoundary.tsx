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

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <span className="text-6xl font-black bg-gradient-to-br from-red-400 to-orange-500 bg-clip-text text-transparent select-none">
                Oops
              </span>
            </div>

            <h1 className="text-xl font-bold mb-3">Something went wrong</h1>
            <p className="text-white/50 mb-4 text-sm leading-relaxed">
              An unexpected error occurred. This has been logged for investigation.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60 transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 text-red-300/70 text-[11px] font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/70 font-medium text-sm hover:bg-white/15 transition-all"
              >
                Go to homepage
              </button>
            </div>

            <p className="mt-10 text-white/25 text-xs">
              Brandtelligence Platform
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
