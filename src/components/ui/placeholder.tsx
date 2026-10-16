import { BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'

// Elegant editorial placeholder used when no image has been uploaded yet.
export function ImagePlaceholder({ kind = 'image', className }: { kind?: 'image' | 'portrait' | 'book'; className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-secondary/60', className)}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #c8a45c 0%, transparent 60%)' }} />
      <div className="absolute inset-3 border border-border/50 rounded-[inherit] pointer-events-none" />
      {kind === 'portrait' ? <User className="size-14 text-muted-foreground/40" strokeWidth={1} />
        : kind === 'book' ? <BookOpen className="size-12 text-muted-foreground/40" strokeWidth={1} />
        : <span className="font-display text-4xl text-muted-foreground/30 italic">A</span>}
    </div>
  )
}
