import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
          style={{ backgroundColor: "hsl(var(--background))" }}
        >
          <p className="text-5xl mb-4">⚠</p>
          <h1 className="text-xl font-medium mb-2" style={{ color: "hsl(var(--foreground))" }}>
            Something went wrong
          </h1>
          <p className="text-sm mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-5 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
