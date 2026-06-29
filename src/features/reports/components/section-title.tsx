// Consistent section header: an h2 on the left with an optional right-side slot
// (a link or a muted note). Matches the existing dashboard/report section style
// (text-lg / 18px Jakarta 600) so adopting it changes nothing visually. Pure
// server component.
export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-fg">{children}</h2>
      {action}
    </div>
  );
}
