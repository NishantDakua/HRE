import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

function ErrorDetail() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unexpected error";
  return <p className="font-mono text-xs text-muted">{message}</p>;
}

export default function NotFoundPage({ error = false }: { error?: boolean }) {
  return (
    <div className="container max-w-xl space-y-4 py-20">
      <p className="eyebrow text-primary">{error ? "Something broke" : "404"}</p>
      <h1 className="text-4xl tracking-tightest">
        {error ? (
          <>
            That didn&apos;t <em>work.</em>
          </>
        ) : (
          <>
            Nothing idle <em>here.</em>
          </>
        )}
      </h1>
      {error ? <ErrorDetail /> : <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>}
      <Button asChild>
        <Link to="/">Back to Spare</Link>
      </Button>
    </div>
  );
}
