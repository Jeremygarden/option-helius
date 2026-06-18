"use client";

import React, { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary for the application.
 * Catches render errors in child components and shows a recovery UI
 * instead of a blank white page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 gap-4">
          <div className="w-16 h-16 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent-red)] text-2xl shadow-lg">
            ⚠
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-sans">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-mono max-w-md text-center">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-6 py-2.5 rounded-lg bg-[var(--accent-blue)] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
