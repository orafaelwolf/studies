import {redirect} from 'next/navigation'
import {auth} from '@/auth'
import {STUDY_EXAMS, STUDY_MENTORSHIP} from '@/lib/studies-exams'

export const metadata = {title: 'Editais · Studies'}

export default async function NoticesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="eyebrow">Inteligência multiedital</p>
      <h1 className="mt-2 text-3xl font-semibold">Editais</h1>
      <p className="hint">
        Programas importados dos editais verticalizados. Prioridades são orientações de estudo,
        não previsões de cobrança.
      </p>

      <div className="mt-8 space-y-4">
        {STUDY_EXAMS.map((exam) => {
          const official = exam.situacao === 'edital_publicado'
          const sourceUrl = official ? exam.fontes.edital : exam.fontes.referencia
          return (
            <article className="card p-4" key={exam.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{exam.nome}</h2>
                <span className={official ? 'text-xs text-success' : 'text-xs text-warning'}>
                  {official ? 'Edital publicado · FURB' : 'Planejamento não oficial · referência Itajaí'}
                </span>
              </div>
              <p className="mt-2">
                {exam.topicos.length} tópicos · {exam.disciplinas.length} disciplinas · {exam.questoes} questões
                {official ? ' · Prova 13/12/2026' : ' (modelo de prova, não confirmado)'}
              </p>
              <p className="hint">{exam.nota}</p>
              {sourceUrl && (
                <p className="mt-2 text-sm">
                  <a className="underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    {official ? 'Consultar edital de Pomerode' : 'Consultar edital de referência GM Itajaí'}
                  </a>
                </p>
              )}
              <div className="mt-4">
                {exam.disciplinas.map((disciplina) => (
                  <details key={disciplina.disciplina} className="border-t border-rule py-2">
                    <summary className="cursor-pointer font-medium">
                      {disciplina.disciplina}: {disciplina.topicos} tópicos · {disciplina.questoes} questões · {disciplina.pontos.toFixed(2)} pontos
                      {!official && ' (hipótese)'}
                    </summary>
                    <ol className="mt-2 space-y-2 pl-5 text-sm">
                      {exam.topicos.filter((topic) => topic.disciplina === disciplina.disciplina).map((topic) => (
                        <li key={topic.id}>
                          <span className="text-muted">{topic.id}. {topic.eixo} — </span>
                          {topic.topico}
                          <span className="text-muted"> · prioridade sugerida: {topic.prioridade}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </article>
          )
        })}

        <article className="card p-4">
          <h2 className="font-semibold">Mentoria premium — plano de estudo por questões e flashcards</h2>
          <p className="hint mt-2">
            Base da mentoria estatística já elaborada: {STUDY_MENTORSHIP.orcamentoHoras} horas em
            {STUDY_MENTORSHIP.horizonteDias} dias, aproximadamente {STUDY_MENTORSHIP.horasLiquidasPorDia} horas líquidas por dia.
            Pomerode tem prazo definido; GMBC permanece pré-edital.
          </p>
          <p className="mt-2 text-sm">
            A alocação é inicial e deve ser recalculada com o seu desempenho real nas questões
            e revisões de flashcards. Não é uma previsão de nota nem garantia de aprovação.
          </p>
          <details className="mt-3 border-t border-rule py-2">
            <summary className="cursor-pointer font-medium">Ver blocos e prioridades da mentoria</summary>
            <ul className="mt-2 space-y-2 text-sm">
              {STUDY_MENTORSHIP.blocos.map((bloco) => (
                <li key={bloco.bloco}>
                  <strong>{bloco.horas}h</strong> — {bloco.bloco}
                  <span className="text-muted"> · {bloco.prioridade} · {bloco.concurso}</span>
                </li>
              ))}
            </ul>
          </details>
        </article>
      </div>
    </main>
  )
}
