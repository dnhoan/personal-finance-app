import { requireSession, UnauthorizedError } from "@/lib/auth-session";
import { csvStream } from "@/features/export/lib/csv-stream";
import {
  loadUserTransactionsForExport,
  txCsvColumns,
} from "@/features/export/lib/transactions-csv-columns";
import { toIctDateInput } from "@/lib/locale";

// Drizzle/Neon driver needs the Node runtime; also keeps us off the Edge size cap.
export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/export/csv?entity=transactions
// Streams the caller's transactions as a UTF-8-BOM CSV (Excel-friendly, VN dates,
// formula-injection-safe cells). `entity` defaults to transactions — the only
// tabular export; the full multi-entity dump is JSON (/api/export/json).
export async function GET(req: Request): Promise<Response> {
  try {
    const { user } = await requireSession();
    const entity = new URL(req.url).searchParams.get("entity") ?? "transactions";
    if (entity !== "transactions" && entity !== "all") {
      return new Response("unsupported entity", { status: 400 });
    }

    const rows = await loadUserTransactionsForExport(user.id);
    const body = csvStream(rows, txCsvColumns);
    const filename = `transactions-${toIctDateInput(new Date())}.csv`;

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("unauthorized", { status: 401 });
    throw e;
  }
}
