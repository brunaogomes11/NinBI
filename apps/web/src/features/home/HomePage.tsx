import { LayoutDashboard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function HomePage() {
  return (
    <Card className="rounded-card">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <LayoutDashboard
          className="size-10 text-accent-text"
          aria-hidden="true"
        />
        <h1 className="font-semibold text-xl">Nenhum dashboard ainda</h1>
        <p className="text-muted-foreground text-sm">
          Os dashboards que você criar ou receber aparecem na barra lateral.
        </p>
      </CardContent>
    </Card>
  )
}
