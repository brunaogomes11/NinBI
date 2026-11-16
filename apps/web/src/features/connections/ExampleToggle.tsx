import { can, type SchemaPropertyDto } from '@ninbi/contracts'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/features/auth/useSession'
import { useSetExampleSetting } from './api'
import type { SchemaSelection } from './SchemaElementList'

interface ExampleToggleProps {
  connectionId: string
  kind: SchemaSelection['kind']
  element: string
  property: SchemaPropertyDto
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
