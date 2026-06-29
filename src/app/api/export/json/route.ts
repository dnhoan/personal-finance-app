import { requireSession, UnauthorizedError } from "@/lib/auth-session";
import { buildJsonBundle } from "@/features/export/lib/json-bundle";
import { toIctDateInput } from "@/lib/locale";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/export/json
// Returns one JSON object holding arrays for every entity the user owns — a full
// backup-shaped dump. Scoped to the session user; never cached.
export async function GET(): Promise<Response> {
  try {
    const { user } = await requireSession();
    const bundle = await buildJsonBundle(user.id);
    const filename = `finance-backup-${toIctDateInput(new Date())}.json`;

    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("unauthorized", { status: 401 });
    throw e;
  }
}
