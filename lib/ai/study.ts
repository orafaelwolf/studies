import {z} from 'zod'

// Contract for OpenRouter enrichment. Callers must persist every item as a
// draft and may only mark a legal reference verified after checking its source.
export const studyAnalysisSchema = z.object({
  subject: z.string().min(1).max(120),
  concepts: z.array(z.object({title: z.string().min(1).max(240), body: z.string().min(1).max(4000)})).max(8),
  traps: z.array(z.object({alternative: z.string().max(20).nullable(), reason: z.string().min(1).max(2000)})).max(8),
  legalReferences: z.array(z.object({citation: z.string().min(1).max(500), sourceUrl: z.string().url().nullable()})).max(8),
  boardPattern: z.object({summary: z.string().min(1).max(1000), confidence: z.number().min(0).max(1)}).nullable(),
  flashcards: z.array(z.object({front: z.string().min(1).max(1000), back: z.string().min(1).max(4000)})).max(12),
})

export type StudyAnalysis = z.infer<typeof studyAnalysisSchema>

export const STUDY_ANALYSIS_SYSTEM = `Você analisa uma única questão para estudo. Responda somente JSON válido no schema fornecido. Não invente lei, artigo, jurisprudência ou fonte: se não houver referência verificável, retorne legalReferences vazio. Conceitos, pegadinhas e padrões são rascunhos para aprovação humana. Uma única questão nunca prova uma tendência de banca.`

export function studyAnalysisPrompt(input: {prompt: string; choices: {label: string; text: string}[]; correctAnswer: string; board?: string | null; exam?: string | null}) {
  return JSON.stringify({question: input.prompt, choices: input.choices, answerKey: input.correctAnswer, board: input.board || null, exam: input.exam || null})
}
