// Quick-add default-account resolution, ordered: the user's explicit default
// account → else, when exactly one active account exists, that account → else
// null (0 or 2+ active accounts and no explicit default → no pre-selection).
// Pure so the page passes the active list it already loaded and tests stay fast.
export function resolveDefaultAccountId(
  explicitDefaultId: string | null,
  activeAccounts: readonly { id: string }[],
): string | null {
  if (explicitDefaultId) return explicitDefaultId;
  if (activeAccounts.length === 1) return activeAccounts[0]!.id;
  return null;
}
