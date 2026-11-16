import { MESSAGES } from '@ninbi/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AskAiPanel } from './AskAiPanel'

function Harness({
  initial = '',
  running = false,
  attempt = 1,
  onCancel = () => {},
}: {
  initial?: string
  running?: boolean
  attempt?: number
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <AskAiPanel
      value={value}
      onChange={setValue}
      onSubmit={() => {}}
      onCancel={onCancel}
      running={running}
      attempt={attempt}
      error={null}
    />
  )
}

const FIELD = 'Descreva o que você quer ver'

describe('AskAiPanel', () => {
  it('AIQ-14 Enviar fica desabilitado com o texto vazio', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const send = screen.getByRole('button', { name: 'Enviar' })
    expect(send).toBeDisabled()
    await user.type(screen.getByLabelText(FIELD), '   ')
    expect(send).toBeDisabled()
    await user.type(screen.getByLabelText(FIELD), 'total por categoria')
    expect(send).toBeEnabled()
  })

  it('AIQ-15 texto com mais de 4.000 caracteres mostra O pedido passa de 4.000 caracteres', () => {
    render(<Harness initial={'a'.repeat(4001)} />)
    expect(screen.getByText(MESSAGES.aiPromptTooLong)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('AIQ-12 durante a geração mostra Gerando tentativa N de 4 e Cancelar', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<Harness initial="pedido" running attempt={3} onCancel={onCancel} />)
    expect(screen.getByText('Gerando... tentativa 3 de 4')).toBeInTheDocument()
    expect(screen.getByLabelText(FIELD)).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
