import {and, eq, sql} from 'drizzle-orm'
import {redirect} from 'next/navigation'

import {auth} from '@/auth'
import {db} from '@/lib/db'
import {attempts, flashcards, questions} from '@/lib/schema'

export const metadata = {title: 'Estatísticas · Studies'}

export default async function StatisticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const userId = session.user.id
  const [summary] = await db.select({questions: sql<number>`count(distinct ${questions.id})::int`, attempts: sql<number>`count(${attempts.id})::int`, correct: sql<number>`count(${attempts.id}) filter (where ${attempts.outcome} = 'correct')::int`}).from(questions).leftJoin(attempts, and(eq(attempts.questionId, questions.id), eq(attempts.userId, userId))).where(eq(questions.userId, userId))
  const subjects = await db.select({subject: questions.subject, total: sql<number>`count(distinct ${questions.id})::int`, correct: sql<number>`count(${attempts.id}) filter (where ${attempts.outcome} = 'correct')::int`}).from(questions).leftJoin(attempts, and(eq(attempts.questionId, questions.id), eq(attempts.userId, userId))).where(eq(questions.userId, userId)).groupBy(questions.subject).orderBy(sql`count(distinct ${questions.id}) desc`)
  const [pending] = await db.select({value: sql<number>`count(*)::int`}).from(flashcards).where(and(eq(flashcards.userId, userId), eq(flashcards.status, 'approved'), sql`${flashcards.dueAt} <= now()`))
  const total = Number(summary?.questions || 0); const attemptsTotal = Number(summary?.attempts || 0); const correct = Number(summary?.correct || 0); const accuracy = attemptsTotal ? Math.round(correct / attemptsTotal * 100) : 0
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6"><p className="eyebrow">Dados calculados localmente</p><h1 className="mt-2 text-3xl font-semibold">Estatísticas</h1><div className="mt-8 grid gap-4 sm:grid-cols-4"><div className="card p-4"><strong className="text-2xl">{total}</strong><p className="hint">Questões</p></div><div className="card p-4"><strong className="text-2xl">{accuracy}%</strong><p className="hint">Taxa de acerto</p></div><div className="card p-4"><strong className="text-2xl">{attemptsTotal}</strong><p className="hint">Tentativas</p></div><div className="card p-4"><strong className="text-2xl">{Number(pending?.value || 0)}</strong><p className="hint">Flashcards pendentes</p></div></div><section className="mt-10"><h2 className="text-xl font-semibold">Por disciplina</h2><div className="mt-4 space-y-2">{subjects.length === 0 ? <p className="text-sm text-muted">Cadastre questões para iniciar o histórico.</p> : subjects.map((row) => { const count = Number(row.total); const hits = Number(row.correct); return <div key={row.subject || 'geral'} className="card flex justify-between gap-4 p-3"><span>{row.subject || 'Sem disciplina'}</span><span className="text-sm text-muted">{count} questões · {count ? Math.round(hits / count * 100) : 0}% de acerto</span></div>})}</div></section><p className="hint mt-8">A prioridade é derivada das questões erradas, tentativas e revisões pendentes; nenhum número é estimado por IA.</p></main>
}
