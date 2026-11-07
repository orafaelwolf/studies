import assert from 'node:assert/strict'
import test from 'node:test'
import {and, eq} from 'drizzle-orm'

import {processQuestionDeterministically} from '@/lib/studies'
import {flashcards, knowledgeEvidence, knowledgeItems, questions} from '@/lib/schema'
import {scheduleFromReview} from '@/lib/review'
import {isFlashcardDue, summarizeDeck} from '@/lib/flashcard-decks'
import {freshDb, makeUser, makeWorksheet} from './support/db'

test('questão vincula conhecimento e rascunho, não mescla usuários e preserva verificação', async () => {
  const db = await freshDb()
  const userId = await makeUser(db)
  const otherId = await makeUser(db)
  const worksheetId = await makeWorksheet(db, userId)
  const [question] = await db.insert(questions).values({userId, worksheetId, ordinal: 1, promptText: 'Qual é a regra?', questionType: 'multiple_choice', correctAnswer: 'A'}).returning({id: questions.id})
  const input = {questionId: question.id, userId, prompt: 'Qual é a regra?', correctAnswer: 'A', subject: 'Direito', professorComment: 'A regra é expressa no comentário.', choices: [{label: 'A', text: 'Correta'}, {label: 'B', text: 'Incorreta'}, {label: 'C', text: 'Outra incorreta'}]}
  await processQuestionDeterministically(db, input)
  const items = await db.select().from(knowledgeItems).where(eq(knowledgeItems.userId, userId))
  const correct = items.find((item) => item.kind === 'correct_rule')!
  const trap = items.filter((item) => item.kind === 'trap')
  assert.equal(trap.length, 1)
  assert.match(trap[0].body, /Alternativas incorretas identificadas pelo gabarito/)
  await db.update(knowledgeItems).set({status: 'verified'}).where(eq(knowledgeItems.id, correct.id))
  await processQuestionDeterministically(db, input)
  assert.equal((await db.select().from(knowledgeItems).where(and(eq(knowledgeItems.id, correct.id), eq(knowledgeItems.status, 'verified')))).length, 1)
  assert.equal((await db.select().from(knowledgeEvidence).where(eq(knowledgeEvidence.knowledgeItemId, correct.id))).length, 1)
  const cards = await db.select().from(flashcards).where(eq(flashcards.userId, userId))
  assert.equal(cards.length, 1)
  assert.equal(cards[0].knowledgeItemId, correct.id)
  assert.equal(cards[0].deck, 'Direito')
  assert.equal(cards[0].back, input.professorComment)
  assert.equal((await db.select().from(flashcards).where(eq(flashcards.userId, otherId))).length, 0)
})

test('FSRS calcula próximos estados para as quatro avaliações', () => {
  const date = new Date('2026-01-01T12:00:00Z')
  const stored = {dueAt: date, stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, learningSteps: 0, reps: 0, lapses: 0, state: 'new' as const, lastReview: null}
  for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
    const result = scheduleFromReview(stored, rating, date)
    assert.equal(result.card.reps, 1)
    assert.ok(result.card.dueAt.getTime() > date.getTime())
    assert.ok(result.log.rating > 0)
  }
})

test('cartões futuros permanecem no baralho sem entrar na fila vencida', () => {
  const now = new Date('2026-01-01T00:00:00Z').getTime()
  const cards = [{status: 'approved' as const, state: 'review' as const, dueAt: '2026-02-01T00:00:00Z'}, {status: 'draft' as const, state: 'new' as const, dueAt: '2025-01-01T00:00:00Z'}]
  assert.equal(cards.filter((card) => isFlashcardDue(card, now)).length, 0)
  assert.equal(summarizeDeck(cards, now).scheduled, 1)
  assert.equal(cards.length, 2)
})
