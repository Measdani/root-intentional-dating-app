import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-5">
            <h1 className="font-display text-2xl text-[#F6FFF2]">Something went wrong</h1>
            <p className="text-sm text-[#A9B5AA]">
              We hit an unexpected error. Your data is safe — reloading the page usually fixes this.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium hover:scale-[1.02] transition-transform"
            >
              Reload
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-4 p-4 bg-[#111611] border border-[#1A211A] rounded-lg text-left text-xs text-red-300 overflow-auto max-h-64">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
