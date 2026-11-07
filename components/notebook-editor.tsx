'use client'

import {useState} from 'react'
import {BlockNoteViewRaw, useCreateBlockNote} from '@blocknote/react'
import {useRouter} from 'next/navigation'
import {type PartialBlock} from '@blocknote/core'
import '@blocknote/react/style.css'

export function NotebookEditor({id, body, status, document}: {id: string; body: string; status: 'draft' | 'verified'; document?: Record<string, unknown>[] | null}) {
  const router = useRouter()
  const editor = useCreateBlockNote({initialContent: document?.length ? document as PartialBlock[] : [{type: 'paragraph', content: [{type: 'text', text: body}]}]})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  async function save(nextStatus: 'draft' | 'verified') {
    setSaving(true); setSaved('')
    const markdown = await editor.blocksToMarkdownLossy(editor.document)
    const response = await fetch('/api/knowledge/' + id, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({body: markdown || body, document: editor.document, status: nextStatus})})
    setSaving(false); setSaved(response.ok ? 'Salvo.' : 'Não foi possível salvar.')
    if (response.ok) router.refresh()
  }

  return <div className="mt-3 border border-rule"><BlockNoteViewRaw editor={editor} theme="light" /><div className="flex flex-wrap gap-2 border-t border-rule p-2"><button className="btn btn-secondary w-auto" disabled={saving} onClick={() => save('draft')}>Salvar rascunho</button><button className="btn btn-primary w-auto" disabled={saving} onClick={() => save('verified')}>{status === 'verified' ? 'Salvar verificado' : 'Marcar como verificado'}</button>{saved && <span className="hint my-auto">{saved}</span>}</div></div>
}
