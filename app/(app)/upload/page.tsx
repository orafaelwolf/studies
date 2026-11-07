import Link from 'next/link'
import {redirect} from 'next/navigation'
import {PageHead} from '@/components/page-head'

import {auth} from '@/auth'
import {resolveProvider} from '@/lib/ai/resolve'
import {operatorUsage} from '@/lib/ai/usage'
import {db} from '@/lib/db'
import {UsageNotice} from '@/components/usage-notice'
import {flattenTaxonomy} from '@/lib/taxonomy'

import UploadClient, {type SubjectGroup} from './upload-client'

export const metadata = {title: 'Enviar caderno em PDF · Studies'}

function subjectGroups(): SubjectGroup[] {
  const topics = flattenTaxonomy()
  const examIds = new Set(['pomerode-2026', 'gmbc-2026'])
  const groups: SubjectGroup[] = []

  for (const root of topics) {
    if (root.depth !== 0 || !examIds.has(root.slug)) continue

    const options = [{slug: root.slug, label: 'Todas as disciplinas'}]

    for (const child of topics) {
      if (child.depth !== 1) continue
      if (child.parentSlug !== root.slug) continue

      options.push({slug: child.slug, label: child.name})
    }

    groups.push({label: root.name, options})
  }

  return groups
}

export default async function UploadPage() {
  const session = await auth()
  if (!session || !session.user || !session.user.id) redirect('/signin')

  const resolved = await resolveProvider(db, session.user.id)

  let usage = null
  if (resolved.tier === 'trial' && resolved.executor === 'server') {
    usage = await operatorUsage(db)
  }

  const noReader = resolved.executor === 'none'

  let noReaderLine =
    'A extração automática de questões está indisponível. Você ainda pode cadastrar questões manualmente. Para ativar a leitura por IA, configure seu provedor em'
  if (resolved.tier === 'trial') {
    noReaderLine =
      'Nenhum provedor de IA está configurado para extrair questões de PDFs. Você pode continuar cadastrando questões manualmente. Para ativar a extração, acesse'
  }

  let sharedReads = undefined
  if (usage) sharedReads = {calls: usage.calls, cap: usage.cap}

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/dashboard"
          className="text-muted hover:text-fg"
        >
          Dashboard
        </Link>
      </nav>

      <div className="mb-8">
        <PageHead title="Enviar questões em PDF" />
      </div>

      {usage && usage.level !== 'ok' && (
        <div className="mb-6">
          <UsageNotice usage={usage} samplesHref="/nova-questao" />
        </div>
      )}

      {noReader && (
        <div className="mb-6 rounded-xl border border-caution/40 bg-caution/10 px-3 py-2 text-sm text-caution">
          <p role="status" className="text-pretty">
            {noReaderLine}{' '}
            <Link href="/settings" className="underline">
              settings
            </Link>
            .
          </p>
        </div>
      )}

      <UploadClient
        subjects={subjectGroups()}
        sharedReads={sharedReads}
      />
    </main>
  )
}
