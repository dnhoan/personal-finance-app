import type { Instrumentation } from "next";
import { logger, formatError } from "@/lib/logger";

// Central server-side error trace. Next invokes this for every uncaught error in
// Server Components, Route Handlers, Server Actions, and middleware — in both dev
// and production — so failures are logged to the terminal / function logs with
// request + route context even when the client only sees a redacted message.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  logger.error("server", formatError(err), {
    method: request.method,
    path: request.path,
    routerKind: context.routerKind,
    routeType: context.routeType,
    routePath: context.routePath,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    digest: (err as { digest?: string }).digest,
  });
};
