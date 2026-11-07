import {createHash} from 'node:crypto'

import {and, eq} from 'drizzle-orm'

import {type Db} from '@/lib/db'
import {flashcards, knowledgeEvidence, knowledgeItems} from '@/lib/schema'

export type StudyEvidence = {
  questionId: string
  userId: string
  prompt: string
  correctAnswer: string
  markedAnswer?: string | null
  subject?: string | null
  examBoard?: string | null
  examName?: string | null
  legalReference?: string | null
}

export function stableHash(...parts: Array<string | null | undefined>) {
  return createHash('sha256').update(parts.map((part) => (part || '').trim().toLowerCase()).join('\n')).digest('hex')
}

function documentFor(body: string) {
  return [{type: 'paragraph', content: [{type: 'text', text: body}]}]
}

async function saveItem(
  db: Db,
  evidence: StudyEvidence,
  kind: 'correct_rule' | 'trap' | 'law_reference' | 'board_pattern',
  title: string,
  body: string,
  officialReference?: string | null,
) {
  const contentHash = stableHash(kind, title, body, officialReference)
  await db.insert(knowledgeItems).values({
    userId: evidence.userId,
    kind,
    title,
    body,
    document: documentFor(body),
    subject: evidence.subject || null,
    officialReference: officialReference || null,
    contentHash,
  }).onConflictDoNothing()

  const [item] = await db.select({id: knowledgeItems.id}).from(knowledgeItems).where(
    and(eq(knowledgeItems.userId, evidence.userId), eq(knowledgeItems.contentHash, contentHash)),
  ).limit(1)
  if (!item) throw new Error('Não foi possível salvar o conhecimento.')

  await db.insert(knowledgeEvidence).values({knowledgeItemId: item.id, questionId: evidence.questionId}).onConflictDoNothing()
  return item.id
}

// This deterministic baseline is intentionally conservative. Cloud analysis may
// enrich drafts later, but never upgrades legal claims to verified facts.
export async function organizeQuestionEvidence(db: Db, evidence: StudyEvidence) {
  const ids: string[] = []
  const correctBody = 'Gabarito informado: ' + evidence.correctAnswer + '. Confirme a fundamentação antes de usar isto como regra.'
  const correctId = await saveItem(db, evidence, 'correct_rule', 'Gabarito informado', correctBody)
  ids.push(correctId)

  if (evidence.markedAnswer && evidence.markedAnswer !== evidence.correctAnswer) {
    ids.push(await saveItem(
      db,
      evidence,
      'trap',
      'Alternativa marcada que diverge do gabarito',
      'A alternativa ' + evidence.markedAnswer + ' foi marcada, mas o gabarito informado é ' + evidence.correctAnswer + '. Registre o motivo do erro antes de consolidar esta pegadinha.',
    ))
  }

  if (evidence.legalReference) {
    ids.push(await saveItem(
      db,
      evidence,
      'law_reference',
      'Referência legal informada',
      'Referência fornecida pelo usuário: ' + evidence.legalReference + '. Verificação oficial pendente.',
      evidence.legalReference,
    ))
  }

  if (evidence.examBoard) {
    const exam = evidence.examName ? ' no concurso ' + evidence.examName : ''
    ids.push(await saveItem(
      db,
      evidence,
      'board_pattern',
      'Evidência de cobrança: ' + evidence.examBoard,
      'Questão cadastrada da banca ' + evidence.examBoard + exam + '. Este registro é uma evidência individual, não uma generalização estatística.',
    ))
  }

  const front = evidence.prompt.slice(0, 500)
  const back = 'Gabarito informado: ' + evidence.correctAnswer
  const cardHash = stableHash('flashcard', front, back)
  await db.insert(flashcards).values({
    userId: evidence.userId,
    knowledgeItemId: correctId,
    front,
    back,
    deck: evidence.subject || 'Geral',
    topic: evidence.subject || null,
    contentHash: cardHash,
    dueAt: new Date(),
  }).onConflictDoNothing()

  return {knowledgeItemIds: ids, flashcardCreated: true}
}
