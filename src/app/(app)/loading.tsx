/** Shown while a page's server data loads: the shape of a header and a list, so nothing jumps. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="mb-2 h-4 w-40 rounded bg-paper-2" />
      <div className="mb-8 h-10 w-80 max-w-full rounded bg-paper-2" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 rounded-[22px] border border-rule bg-card" />
        ))}
      </div>
    </div>
  );
}
