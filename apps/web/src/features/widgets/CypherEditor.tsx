import Prism from 'prismjs'
import 'prismjs/components/prism-cypher'
import { useId } from 'react'
import Editor from 'react-simple-code-editor'
import { Label } from '@/components/ui/label'

function highlight(code: string): string {
  return Prism.highlight(code, Prism.languages.cypher, 'cypher')
}

/** Editor de Cypher com realce de sintaxe; as cores dos tokens vêm do tema (`.cypher-editor`). */
export function CypherEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Cypher</Label>
      <div className="cypher-editor max-h-64 overflow-auto rounded-control border border-input bg-card-elevated">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={highlight}
          padding={12}
          textareaId={id}
          textareaClassName="focus:outline-none"
          className="min-h-32 font-mono text-sm"
        />
      </div>
    </div>
  )
}
