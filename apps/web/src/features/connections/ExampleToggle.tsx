import { can, type ExampleSetting } from '@ninbi/contracts'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/features/auth/useSession'
import { useSetExampleSetting } from './api'

interface ExampleToggleProps {
  connectionId: string
  kind: ExampleSetting['kind']
  element: string
  property: { name: string; sendExample: boolean }
}

/** Liga ou desliga o envio do exemplo da propriedade à IA; só quem gerencia conexões pode mudar. */
export function ExampleToggle({
  connectionId,
  kind,
  element,
  property,
}: ExampleToggleProps) {
  const { user } = useSession()
  const canManage = !!user && can(user.role, 'connections.manage')
  const setting = useSetExampleSetting(connectionId)

  return (
    <Switch
      aria-label="Enviar exemplo à IA"
      checked={property.sendExample}
      disabled={!canManage || setting.isPending}
      onCheckedChange={(sendExample) =>
        setting.mutate(
          { kind, element, property: property.name, sendExample },
          { onError: (error) => toast.error(error.message) },
        )
      }
    />
  )
}
