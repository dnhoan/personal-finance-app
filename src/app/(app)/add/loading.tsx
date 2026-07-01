// Instant skeleton for the /add capture route so navigation never shows a blank
// wait. Mirrors the screen's shape: header, amount hero, chip row, keypad grid.
export default function AddLoading() {
  return (
    <div className="flex min-h-[100dvh] animate-pulse flex-col gap-4 -mt-[max(1rem,env(safe-area-inset-top))] -mb-24 pt-[max(0.5rem,env(safe-area-inset-top))] md:-mb-8">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-full bg-surface-muted" />
        <div className="h-9 w-40 rounded-md bg-surface-muted" />
        <div className="h-9 w-9" />
      </div>
      <div className="h-28 rounded-lg bg-surface-muted" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-full bg-surface-muted" />
        <div className="h-9 w-24 rounded-full bg-surface-muted" />
        <div className="h-9 w-20 rounded-full bg-surface-muted" />
      </div>
      <div className="mt-auto grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="h-14 rounded-md bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
