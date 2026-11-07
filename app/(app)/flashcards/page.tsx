import {and, asc, eq, lte} from 'drizzle-orm'
import {redirect} from 'next/navigation'

import {auth} from '@/auth'
import {db} from '@/lib/db'
import {flashcards} from '@/lib/schema'
import {FlashcardList, type FlashcardRow} from './flashcard-list'

export const metadata = {title: 'Flashcards · Studies'}

export default async function FlashcardsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const rows = await db.select({id: flashcards.id, front: flashcards.front, back: flashcards.back, deck: flashcards.deck, status: flashcards.status, dueAt: flashcards.dueAt}).from(flashcards).where(and(eq(flashcards.userId, session.user.id), eq(flashcards.status, 'draft'))).orderBy(asc(flashcards.createdAt))
  const due = await db.select({id: flashcards.id, front: flashcards.front, back: flashcards.back, deck: flashcards.deck, status: flashcards.status, dueAt: flashcards.dueAt}).from(flashcards).where(and(eq(flashcards.userId, session.user.id), eq(flashcards.status, 'approved'), lte(flashcards.dueAt, new Date()))).orderBy(asc(flashcards.dueAt)).limit(30)
  const cards: FlashcardRow[] = [...rows, ...due].map((card) => ({...card, dueAt: card.dueAt.toISOString()}))
  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><p className="eyebrow">Revisão espaçada</p><h1 className="mt-2 text-3xl font-semibold">Flashcards</h1><p className="hint">Aprove rascunhos, revele a resposta e avalie sua lembrança. As próximas revisões são calculadas com FSRS.</p><FlashcardList initial={cards} /></main>
}
