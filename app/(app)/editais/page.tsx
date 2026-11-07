import {redirect} from 'next/navigation'
import {auth} from '@/auth'

const notices = [
  {name: 'Câmara de Pomerode', status: 'Acompanhamento inicial', source: 'A confirmar no portal oficial da Câmara e na publicação do edital.', kind: 'hipótese'},
  {name: 'GM Balneário Camboriú', status: 'Edital ainda não confirmado', source: 'Sem edital oficial cadastrado nesta aplicação.', kind: 'hipótese'},
]

export const metadata = {title: 'Editais · Studies'}

export default async function NoticesPage() {
  const session = await auth(); if (!session?.user?.id) redirect('/signin')
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><p className="eyebrow">Inteligência multiedital</p><h1 className="mt-2 text-3xl font-semibold">Editais</h1><p className="hint">Somente fontes oficiais podem transformar uma hipótese em conteúdo confirmado.</p><div className="mt-8 space-y-4">{notices.map((notice) => <article className="card p-4" key={notice.name}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{notice.name}</h2><span className="text-xs text-warning">Hipótese — não oficial</span></div><p className="mt-2">{notice.status}</p><p className="hint">{notice.source}</p></article>)}</div></main>
}
