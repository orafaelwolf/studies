import {and, asc, eq} from 'drizzle-orm'
import {redirect} from 'next/navigation'
import {auth} from '@/auth'
import {db} from '@/lib/db'
import {flashcards, knowledgeEvidence, knowledgeItems, questions} from '@/lib/schema'
import {FlashcardList, type FlashcardRow} from './flashcard-list'

export const metadata = {title: 'Flashcards · Studies'}

export default async function FlashcardsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const userId = session.user.id
  const [rows, sources] = await Promise.all([
    db.select().from(flashcards).where(eq(flashcards.userId, userId)).orderBy(asc(flashcards.dueAt)),
    db.select({knowledgeId: knowledgeItems.id, title: knowledgeItems.title, questionId: questions.id, prompt: questions.promptText, exam: questions.examName}).from(knowledgeItems).innerJoin(knowledgeEvidence, eq(knowledgeEvidence.knowledgeItemId, knowledgeItems.id)).innerJoin(questions, eq(questions.id, knowledgeEvidence.questionId)).where(and(eq(knowledgeItems.userId, userId), eq(questions.userId, userId))),
  ])
  const cards: FlashcardRow[] = rows.map((card) => ({id: card.id, front: card.front, back: card.back, deck: card.deck, topic: card.topic, status: card.status, dueAt: card.dueAt.toISOString(), state: card.state, sources: sources.filter((source) => source.knowledgeId === card.knowledgeItemId)}))
  const now = new Date().getTime()
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><p className="eyebrow">Revisão espaçada</p><h1 className="mt-2 text-3xl font-semibold">Flashcards</h1><p className="hint">Aprove e revise seus cartões. O FSRS calcula as próximas revisões.</p><FlashcardList initial={cards} now={now} /></main>
}
