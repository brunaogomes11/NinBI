import { cn } from '@/lib/utils'
import { type Theme, useTheme } from '@/theme/ThemeProvider'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <fieldset className="flex rounded-control bg-card-elevated p-1">
      <legend className="sr-only">Tema</legend>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex-1 rounded-[8px] px-3 py-1.5 font-medium text-sm transition-colors',
            theme === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
