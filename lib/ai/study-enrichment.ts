import {operatorCallsToday, recordOperatorCall} from '@/lib/ai/usage'
import {operatorCallsPerDay} from '@/lib/ai/types'
import {studyAnalysisPrompt, studyAnalysisSchema, STUDY_ANALYSIS_SYSTEM} from '@/lib/ai/study'
import {applySemanticStudyAnalysis, type StudyEvidence} from '@/lib/studies'
import {type Db} from '@/lib/db'

export async function enrichQuestionWithOpenRouter(db: Db, evidence: StudyEvidence) {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) return {mode: 'essential' as const, reason: 'OpenRouter não configurado'}
  if (await operatorCallsToday(db) >= operatorCallsPerDay()) return {mode: 'essential' as const, reason: 'Limite diário de OpenRouter atingido'}
  try {
    await recordOperatorCall(db)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + key, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'X-Title': 'Studies'},
      body: JSON.stringify({model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash', messages: [{role: 'system', content: STUDY_ANALYSIS_SYSTEM}, {role: 'user', content: studyAnalysisPrompt({prompt: evidence.prompt, choices: evidence.choices, correctAnswer: evidence.correctAnswer, board: evidence.examBoard, exam: evidence.examName})}], response_format: {type: 'json_object'}}), signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error('OpenRouter respondeu HTTP ' + response.status)
    const body = await response.json() as {choices?: {message?: {content?: string}}[]}
    const content = body.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenRouter não retornou conteúdo.')
    await applySemanticStudyAnalysis(db, evidence, studyAnalysisSchema.parse(JSON.parse(content)))
    return {mode: 'intelligent' as const}
  } catch (error) {
    console.error('[studies] optional OpenRouter enrichment failed:', error)
    return {mode: 'essential' as const, reason: 'Enriquecimento opcional indisponível'}
  }
}
