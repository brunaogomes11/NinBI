import { MESSAGES } from '@ninbi/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  AssistantComposer,
  type AssistantComposerProps,
} from './AssistantComposer'

function Harness({
  initial = '',
  onSubmit = () => {},
  onCancel = () => {},
  running = false,
  progress = null,
}: {
  initial?: string
  onSubmit?: () => void
  onCancel?: () => void
  running?: boolean
  progress?: AssistantComposerProps['progress']
}) {
  const [value, setValue] = useState(initial)
  return (
    <AssistantComposer
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onCancel={onCancel}
      running={running}
      progress={progress}
    />
  )
}

describe('AssistantComposer', () => {
  it('CHAT-15 Enviar fica desabilitado com a mensagem vazia', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    const send = screen.getByRole('button', { name: 'Enviar' })
    expect(send).toBeDisabled()
    const field = screen.getByLabelText('Mensagem')
    await user.type(field, '   ')
    expect(send).toBeDisabled()
    await user.type(field, '{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    await user.clear(field)
    await user.type(field, 'troque para linha')
    expect(send).toBeEnabled()
    await user.click(send)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('CHAT-16 mensagem com mais de 4.000 caracteres mostra A mensagem passa de 4.000 caracteres', () => {
    render(<Harness initial={'a'.repeat(4001)} />)
    expect(screen.getByText(MESSAGES.assistantMessageTooLong)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    expect(screen.getByText('4.001/4.000')).toBeInTheDocument()
  })

  it('CHAT-13 durante a resposta o campo fica desabilitado e mostra Cancelar', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<Harness initial="oi" running onCancel={onCancel} />)
    expect(screen.getByLabelText('Mensagem')).toBeDisabled()
    expect(screen.getByText('Pensando...')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('GEN-08 durante a geração mostra Gerando widget N de M e Cancelar', () => {
    render(<Harness running progress={{ index: 2, total: 5 }} />)
    expect(screen.getByText('Gerando widget 2 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
  })

  it('Enter envia e Shift+Enter quebra a linha sem enviar', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    const field = screen.getByLabelText('Mensagem')
    await user.type(field, 'linha 1{Shift>}{Enter}{/Shift}linha 2')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(field).toHaveValue('linha 1\nlinha 2')
    await user.type(field, '{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('sem provedor o campo fica desabilitado com a mensagem', () => {
    render(
      <AssistantComposer
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
        running={false}
        progress={null}
        disabledReason={MESSAGES.llmNotConfigured}
      />,
    )
    expect(screen.getByLabelText('Mensagem')).toBeDisabled()
    expect(screen.getByText(MESSAGES.llmNotConfigured)).toBeInTheDocument()
  })
})
