export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="reveal mb-10 space-y-3">
      <div className="flex items-center gap-4">
        <span className="h-px w-10 bg-[#c8a45c]/60" />
        <h2 className="font-display text-3xl md:text-4xl font-semibold">{title}</h2>
      </div>
      {subtitle && <p className="text-muted-foreground ps-14">{subtitle}</p>}
    </div>
  )
}
