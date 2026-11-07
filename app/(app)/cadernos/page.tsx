import {and, desc, eq} from 'drizzle-orm'
import {redirect} from 'next/navigation'

import {auth} from '@/auth'
import {db} from '@/lib/db'
import {knowledgeEvidence, knowledgeItems, questions} from '@/lib/schema'
import {Notebooks} from './notebooks'

export const metadata = {title: 'Cadernos · Studies'}

export default async function NotebooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const userId = session.user.id
  const [items, sources] = await Promise.all([
    db.select().from(knowledgeItems).where(eq(knowledgeItems.userId, userId)).orderBy(desc(knowledgeItems.updatedAt)),
    db.select({itemId: knowledgeEvidence.knowledgeItemId, questionId: questions.id, prompt: questions.promptText, board: questions.examBoard, exam: questions.examName, subject: questions.subject, comment: questions.professorComment, imported: questions.importSource}).from(knowledgeEvidence).innerJoin(knowledgeItems, eq(knowledgeItems.id, knowledgeEvidence.knowledgeItemId)).innerJoin(questions, eq(questions.id, knowledgeEvidence.questionId)).where(and(eq(knowledgeItems.userId, userId), eq(questions.userId, userId))),
  ])
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6"><p className="eyebrow">Base de conhecimentos</p><h1 className="mt-2 text-3xl font-semibold">Cadernos inteligentes</h1><p className="hint">Conhecimentos e evidências vinculados às suas questões.</p><Notebooks items={items.map((item) => ({id: item.id, kind: item.kind, title: item.title, body: item.body, document: item.document, subject: item.subject, status: item.status, sources: sources.filter((source) => source.itemId === item.id)}))} /></main>
}
