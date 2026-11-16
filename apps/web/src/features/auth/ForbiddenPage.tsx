import { MESSAGES } from '@ninbi/contracts'
import { Link } from 'react-router'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-start gap-3 p-6">
      <h1 className="font-semibold text-lg">{MESSAGES.forbiddenPage}</h1>
      <Link to="/" className="text-accent-text underline">
        Ir para a página inicial
      </Link>
    </div>
  )
}
