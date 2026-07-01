// Server-side structured logger. Writes single-line, greppable records to
// stdout/stderr so failures surface in the dev terminal and in Vercel function
// logs. Server-only — do not import from client components.

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function serializeContext(context?: LogContext): string {
  if (!context) return "";
  const entries = Object.entries(context).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  try {
    return " " + JSON.stringify(Object.fromEntries(entries));
  } catch {
    return " [uncserializable-context]";
  }
}

function write(level: LogLevel, scope: string, message: string, context?: LogContext): void {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} [${scope}] ${message}${serializeContext(context)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (scope: string, message: string, context?: LogContext) =>
    write("info", scope, message, context),
  warn: (scope: string, message: string, context?: LogContext) =>
    write("warn", scope, message, context),
  error: (scope: string, message: string, context?: LogContext) =>
    write("error", scope, message, context),
};

// Extracts a full stack (or a stringified fallback) from an unknown thrown value.
export function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
