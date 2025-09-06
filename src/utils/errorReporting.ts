// Simple error reporting utility
// In production, you'd integrate with services like Sentry, LogRocket, etc.

interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  timestamp: Date;
  url: string;
  userAgent: string;
}

class ErrorReporter {
  private isProduction = process.env.NODE_ENV === 'production';
  private errors: ErrorReport[] = [];

  captureError(error: Error, context?: Record<string, any>, userId?: string) {
    const report: ErrorReport = {
      error,
      context,
      userId,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Store locally for now
    this.errors.push(report);

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error captured:', report);
    }

    // In production, send to your error service
    if (this.isProduction) {
      this.sendToErrorService(report);
    }
  }

  private async sendToErrorService(report: ErrorReport) {
    try {
      // Example: Send to your backend error collection endpoint
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: report.error.message,
          stack: report.error.stack,
          context: report.context,
          userId: report.userId,
          timestamp: report.timestamp.toISOString(),
          url: report.url,
          userAgent: report.userAgent
        })
      });
    } catch (sendError) {
      console.error('Failed to send error report:', sendError);
    }
  }

  // Get recent errors for admin dashboard
  getRecentErrors(limit = 50): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  // Clear old errors (keep only last 100)
  cleanup() {
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }
}

export const errorReporter = new ErrorReporter();

// Global error handlers
window.addEventListener('error', (event) => {
  errorReporter.captureError(new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorReporter.captureError(new Error(event.reason), {
    type: 'unhandled_promise_rejection'
  });
});

// Utility function for manual error reporting
export function reportError(error: Error, context?: Record<string, any>) {
  errorReporter.captureError(error, context);
}

// Hook for React components
export function useErrorReporting() {
  return {
    reportError: (error: Error, context?: Record<string, any>) => {
      errorReporter.captureError(error, context);
    }
  };
}