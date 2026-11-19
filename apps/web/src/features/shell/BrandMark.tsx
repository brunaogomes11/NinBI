import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img src="/brand/ninbi-symbol.png" alt="" className="size-8" />
      <span className="brand-wordmark text-foreground">
        Nin<span className="text-accent-text">BI</span>
      </span>
    </div>
  )
}
