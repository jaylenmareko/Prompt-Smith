import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <p className="text-7xl font-light mb-4" style={{ color: "hsl(var(--foreground))" }}>
        404
      </p>
      <h1 className="text-xl font-medium mb-2" style={{ color: "hsl(var(--foreground))" }}>
        Page not found
      </h1>
      <p className="text-sm mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
        This page doesn't exist or was moved.
      </p>
      <button
        onClick={() => navigate("/")}
        className="text-sm px-5 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
      >
        Back to Prompt Smith
      </button>
    </div>
  );
}
