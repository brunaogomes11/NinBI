import type { ConnectionDto } from '@ninbi/contracts'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteConnection } from './api'
import { ConnectionFormDialog } from './ConnectionFormDialog'

function DeleteDialog({
  connection,
  open,
  onOpenChange,
}: {
  connection: ConnectionDto
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteConnection(connection.id)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir a conexão {connection.name}?
          </AlertDialogTitle>{' '}
          <AlertDialogDescription>
            O schema guardado também será apagado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.error && (
          <p role="alert" className="text-destructive text-sm">
            {remove.error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={remove.isPending}
            onClick={(event) => {
              // o diálogo só fecha quando a chamada dá certo
              event.preventDefault()
              remove.mutate(undefined, { onSuccess: () => onOpenChange(false) })
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** "Editar" abre o diálogo da conexão da linha; "Excluir" pede confirmação (CONN-17, CONN-18). */
export function ConnectionRowActions({
  connection,
}: {
  connection: ConnectionDto
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setEditOpen(true)}
      >
        Editar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDeleteOpen(true)}
      >
        Excluir
      </Button>
      <ConnectionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        connection={connection}
      />
      <DeleteDialog
        connection={connection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}
