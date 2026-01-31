/**
 * @file        ErrorBoundary
 * @description Global error boundary to catch unhandled React errors
 */

import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
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
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              An unexpected error occurred. Please try again or return to the dashboard.
            </p>
            {this.state.error && import.meta.env.DEV && (
              <pre className={styles.details}>{this.state.error.message}</pre>
            )}
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={this.handleReload}>
                Go to Dashboard
              </button>
              <button className={styles.secondaryBtn} onClick={this.handleRetry}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
