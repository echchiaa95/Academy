export function PostSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="aspect-[16/10] rounded-xl bg-secondary/70" />
      <div className="h-3 w-1/3 rounded bg-secondary/70" />
      <div className="h-5 w-3/4 rounded bg-secondary/70" />
      <div className="h-3 w-full rounded bg-secondary/70" />
    </div>
  )
}
export function BookSkeleton() {
  return <div className="aspect-[3/4] animate-pulse rounded-lg bg-secondary/70" />
}
export function TextSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="h-4 rounded bg-secondary/70" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  )
}
