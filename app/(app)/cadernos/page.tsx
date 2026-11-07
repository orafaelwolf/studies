import {desc, eq} from 'drizzle-orm'
import {redirect} from 'next/navigation'

import {auth} from '@/auth'
import {NotebookEditor} from '@/components/notebook-editor'
import {db} from '@/lib/db'
import {knowledgeItems} from '@/lib/schema'

const groups = [
  ['correct_rule', 'Corretas', 'Regras e conceitos confirmados pelo seu estudo.'],
  ['trap', 'Pegadinhas', 'Alternativas e raciocínios que pedem atenção.'],
  ['law_reference', 'Lei seca', 'Referências informadas, sempre com estado de verificação visível.'],
  ['board_pattern', 'Padrões da banca', 'Evidências agrupadas sem transformar uma questão isolada em regra.'],
] as const

export const metadata = {title: 'Cadernos · Studies'}

export default async function NotebooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const items = await db.select().from(knowledgeItems).where(eq(knowledgeItems.userId, session.user.id)).orderBy(desc(knowledgeItems.updatedAt))
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6"><p className="eyebrow">Base de conhecimentos</p><h1 className="mt-2 text-3xl font-semibold">Cadernos inteligentes</h1><p className="hint">Os quatro cadernos são visões da mesma base, com cada evidência ligada à questão de origem.</p><div className="mt-8 space-y-10">{groups.map(([kind, title, description]) => { const group = items.filter((item) => item.kind === kind); return <section key={kind}><h2 className="text-xl font-semibold">{title}</h2><p className="hint">{description}</p>{group.length === 0 ? <p className="mt-3 text-sm text-muted">Ainda não há registros.</p> : <div className="mt-4 space-y-4">{group.map((item) => <article className="card p-4" key={item.id}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="text-xs text-muted">{item.status === 'verified' ? 'Verificado' : 'Rascunho'}</span></div><NotebookEditor id={item.id} body={item.body} status={item.status} /></article>)}</div>}</section>})}</div></main>
}
