import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
          <span className="text-6xl mb-4">😰</span>
          <h1 className="text-2xl font-bold text-text mb-2">Oops! Something went wrong.</h1>
          <p className="text-text-muted mb-6 max-w-xs">
            The application encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-3"
          >
            Reload App
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-bg-dark text-danger text-xs text-left overflow-auto max-w-full rounded-lg">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
