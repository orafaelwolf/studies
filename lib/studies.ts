import {createHash} from 'node:crypto'

import {and, eq} from 'drizzle-orm'

import {type Db} from '@/lib/db'
import {flashcards, knowledgeEvidence, knowledgeItems} from '@/lib/schema'
import {type StudyAnalysis} from '@/lib/ai/study'

export type StudyChoice = {label: string; text: string}
export type StudyEvidence = {
  questionId: string; userId: string; prompt: string; correctAnswer: string; choices: StudyChoice[]
  markedAnswer?: string | null; subject?: string | null; examBoard?: string | null; examName?: string | null
  legalReference?: string | null; professorComment?: string | null; sourceNumber?: number | null
}

export function stableHash(...parts: Array<string | null | undefined>) {
  return createHash('sha256').update(parts.map((part) => (part || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()).join('\n')).digest('hex')
}

export function extractLegalReferences(text: string) {
  const found = new Set<string>()
  const patterns = [/(?:art\.?|artigo)\s*\d+[ºo]?(?:\s*,?\s*(?:inciso\s*)?[IVXLCDM]+)?/gi, /§\s*\d+[ºo]?/g, /Lei\s*(?:n[ºo]\.?\s*)?\d+[\d.]*(?:\/\d{2,4})?/gi, /(?:CF\s*\/\s*88|Constitui[cç][aã]o Federal)/gi, /Lei Complementar\s*(?:n[ºo]\.?\s*)?\d+/gi, /Resolu[cç][aã]o\s*(?:n[ºo]\.?\s*)?\d+[\d\/-]*/gi]
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) found.add(match[0].replace(/\s+/g, ' ').trim())
  return [...found]
}

function documentFor(body: string) { return [{type: 'paragraph', content: [{type: 'text', text: body}]}] }

async function saveItem(db: Db, evidence: StudyEvidence, kind: 'correct_rule' | 'trap' | 'law_reference' | 'board_pattern', title: string, body: string, officialReference?: string | null) {
  const contentHash = stableHash(kind, title, body, officialReference)
  await db.insert(knowledgeItems).values({userId: evidence.userId, kind, title, body, document: documentFor(body), subject: evidence.subject || null, officialReference: officialReference || null, contentHash}).onConflictDoNothing()
  const [item] = await db.select({id: knowledgeItems.id}).from(knowledgeItems).where(and(eq(knowledgeItems.userId, evidence.userId), eq(knowledgeItems.contentHash, contentHash))).limit(1)
  if (!item) throw new Error('Não foi possível salvar o conhecimento.')
  await db.insert(knowledgeEvidence).values({knowledgeItemId: item.id, questionId: evidence.questionId}).onConflictDoNothing()
  return item.id
}

// Essential mode: only records facts supplied by the question, never a made-up explanation.
export async function processQuestionDeterministically(db: Db, evidence: StudyEvidence) {
  const correct = evidence.choices.find((choice) => choice.label === evidence.correctAnswer)
  const comment = evidence.professorComment ? '\n\nComentário do professor (material fornecido pelo usuário, não verificado automaticamente):\n' + evidence.professorComment : ''
  const identifiers = [evidence.examBoard, evidence.examName, evidence.sourceNumber ? 'Questão ' + evidence.sourceNumber : null].filter(Boolean).join(' · ')
  const correctBody = 'Alternativa correta (' + evidence.correctAnswer + '):\n' + (correct?.text || 'Texto da alternativa indisponível.') + (identifiers ? '\n\nOrigem: ' + identifiers : '') + comment
  const correctId = await saveItem(db, evidence, 'correct_rule', 'Resposta correta' + (identifiers ? ' · ' + identifiers : ''), correctBody)
  const ids = [correctId]

  for (const choice of evidence.choices) {
    if (choice.label === evidence.correctAnswer) continue
    const personal = choice.label === evidence.markedAnswer ? '\n\nResposta marcada pelo aluno: esta alternativa foi escolhida e diverge do gabarito.' : ''
    ids.push(await saveItem(db, evidence, 'trap', 'Alternativa incorreta ' + choice.label, 'Alternativa incorreta identificada pelo gabarito:\n' + choice.text + personal + comment))
  }

  const legalText = [evidence.legalReference, evidence.prompt, evidence.professorComment, ...evidence.choices.map((choice) => choice.text)].filter(Boolean).join('\n')
  for (const reference of extractLegalReferences(legalText)) ids.push(await saveItem(db, evidence, 'law_reference', 'Referência extraída: ' + reference, 'Referência extraída do material fornecido: ' + reference + '. Pendente de conferência em fonte oficial.', reference))

  if (evidence.examBoard) ids.push(await saveItem(db, evidence, 'board_pattern', 'Evidência de cobrança: ' + evidence.examBoard, 'Uma questão da banca ' + evidence.examBoard + (evidence.examName ? ' no concurso ' + evidence.examName : '') + '. Incidência observada apenas na amostra pessoal; não representa distribuição oficial.'))

  const front = evidence.legalReference ? 'Qual dispositivo foi mencionado na questão?' : 'Qual alternativa estava correta' + (identifiers ? ' em ' + identifiers : '') + '?'
  const back = evidence.legalReference ? evidence.legalReference : (correct?.text || 'Gabarito informado: ' + evidence.correctAnswer)
  if (back.trim()) await db.insert(flashcards).values({userId: evidence.userId, knowledgeItemId: correctId, front, back, deck: evidence.subject || 'Geral', topic: evidence.subject || null, contentHash: stableHash('flashcard', front, back), dueAt: new Date()}).onConflictDoNothing()
  return {knowledgeItemIds: ids, flashcardCreated: Boolean(back.trim())}
}

export async function applySemanticStudyAnalysis(db: Db, evidence: StudyEvidence, analysis: StudyAnalysis) {
  for (const concept of analysis.concepts) await saveItem(db, evidence, 'correct_rule', concept.title, concept.body + '\n\nSugestão semântica de IA — rascunho para conferência.')
  for (const trap of analysis.traps) await saveItem(db, evidence, 'trap', 'Sugestão de pegadinha' + (trap.alternative ? ' · ' + trap.alternative : ''), trap.reason + '\n\nSugestão de IA — rascunho para conferência.')
  for (const legal of analysis.legalReferences) {
    if (!legal.sourceUrl) continue
    await saveItem(db, evidence, 'law_reference', 'Referência sugerida: ' + legal.citation, 'Referência sugerida pela IA; pendente de conferência oficial: ' + legal.citation, legal.sourceUrl)
  }
  if (analysis.boardPattern) await saveItem(db, evidence, 'board_pattern', 'Sugestão de padrão da banca', analysis.boardPattern.summary + '\n\nInferência de IA baseada na questão; não representa distribuição oficial.')
  for (const card of analysis.flashcards) await db.insert(flashcards).values({userId: evidence.userId, front: card.front, back: card.back, deck: evidence.subject || analysis.subject || 'Geral', topic: evidence.subject || analysis.subject || null, contentHash: stableHash('flashcard', card.front, card.back), dueAt: new Date()}).onConflictDoNothing()
}

// Kept for existing callers while the manual route moves to the explicit name.
export const organizeQuestionEvidence = processQuestionDeterministically
