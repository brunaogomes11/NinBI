import { zodResolver } from '@hookform/resolvers/zod'
import { MESSAGES } from '@ninbi/contracts'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const groupNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, MESSAGES.nameRequired)
    .max(40, MESSAGES.shortNameTooLong),
})

type GroupNameInput = z.input<typeof groupNameSchema>

/** "Novo grupo" e "Renomear grupo": um campo "Nome" de 1 a 40 caracteres (SIDE-01, SIDE-02, SIDE-08). */
export function GroupNameDialog({
  title,
  initialName = '',
  onSubmit,
  onClose,
}: {
  title: 'Novo grupo' | 'Renomear grupo'
  initialName?: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const form = useForm<GroupNameInput>({
    resolver: zodResolver(groupNameSchema),
    defaultValues: { name: initialName },
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit((values) => {
              onSubmit(values.name.trim())
              onClose()
            })}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[image:var(--gradient-brand)] text-primary-foreground"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
