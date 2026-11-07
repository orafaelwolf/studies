import {and, eq} from 'drizzle-orm'
import {NextResponse} from 'next/server'
import {z} from 'zod'

import {auth} from '@/auth'
import {readJson} from '@/lib/api'
import {db} from '@/lib/db'
import {flashcardReviews, flashcards} from '@/lib/schema'
import {scheduleFromReview, type StoredCard} from '@/lib/review'

const schema = z.object({rating: z.enum(['again', 'hard', 'good', 'easy'])})

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({error: 'Não autorizado.'}, {status: 401})
  const parsed = schema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({error: 'Avaliação inválida.'}, {status: 400})
  const {id} = await params
  const [card] = await db.select().from(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, session.user.id), eq(flashcards.status, 'approved'))).limit(1)
  if (!card) return NextResponse.json({error: 'Não encontrado.'}, {status: 404})
  const stored: StoredCard = {dueAt: card.dueAt, stability: card.stability, difficulty: card.difficulty, elapsedDays: card.elapsedDays, scheduledDays: card.scheduledDays, learningSteps: card.learningSteps, reps: card.reps, lapses: card.lapses, state: card.state, lastReview: card.lastReview}
  const next = scheduleFromReview(stored, parsed.data.rating)
  await db.transaction(async (tx) => { await tx.update(flashcards).set({...next.card, updatedAt: new Date()}).where(eq(flashcards.id, id)); await tx.insert(flashcardReviews).values({flashcardId: id, ...next.log}) })
  return NextResponse.json({ok: true, dueAt: next.card.dueAt.toISOString(), state: next.card.state})
}
