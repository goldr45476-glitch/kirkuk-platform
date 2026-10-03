/**
 * Server-side error reporting: every unhandled request error is written as one JSON line
 * (searchable in Railway logs; pipe to Sentry/Logtail by adding a drain). No dependencies.
 */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  const e = err as { message?: string; digest?: string; stack?: string };
  console.error(JSON.stringify({
    level: "error", time: new Date().toISOString(), message: e?.message, digest: e?.digest,
    path: request.path, method: request.method, route: context.routePath, type: context.routeType,
    stack: process.env.NODE_ENV === "production" ? undefined : e?.stack,
  }));
}
