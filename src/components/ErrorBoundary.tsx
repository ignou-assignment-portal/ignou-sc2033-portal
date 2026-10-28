import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] p-6 bg-rose-50/80 border border-rose-300 rounded-2xl flex flex-col items-center justify-center text-center my-4 shadow-sm animate-in fade-in">
          <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-rose-950 mb-1">
            {this.props.fallbackTitle || 'Intake Desk Encountered an Unexpected Issue'}
          </h2>
          <p className="text-xs text-rose-800 max-w-md mb-4 leading-relaxed font-medium">
            {this.state.error?.message ||
              'A rendering error occurred while loading this view. Your session records and intake data remain safe.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Recover View</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-zinc-500" />
              <span>Reload Application</span>
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="mt-4 text-left max-w-xl text-[11px] font-mono bg-white p-3 rounded-lg border border-rose-200 text-rose-900 overflow-x-auto">
              <summary className="cursor-pointer font-bold mb-1">Technical Stack Trace</summary>
              <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
