import {createHash} from 'node:crypto'

import {and, asc, eq} from 'drizzle-orm'
import {NextResponse} from 'next/server'
import {z} from 'zod'

import {auth} from '@/auth'
import {readJson} from '@/lib/api'
import {db} from '@/lib/db'
import {answerChoices, attempts, questions, worksheets} from '@/lib/schema'
import {organizeQuestionEvidence} from '@/lib/studies'

const inputSchema = z.object({
  prompt: z.string().trim().min(5).max(12000),
  choices: z.array(z.object({label: z.string().trim().min(1).max(20), text: z.string().trim().min(1).max(4000)})).min(2).max(8),
  correctAnswer: z.string().trim().min(1).max(20),
  markedAnswer: z.string().trim().max(20).optional().nullable(),
  subject: z.string().trim().max(120).optional().nullable(),
  examBoard: z.string().trim().max(120).optional().nullable(),
  examName: z.string().trim().max(180).optional().nullable(),
  legalReference: z.string().trim().max(500).optional().nullable(),
})

function hashQuestion(prompt: string, choices: {label: string; text: string}[]) {
  return createHash('sha256').update(prompt + '\n' + choices.map((choice) => choice.label + ':' + choice.text).join('\n')).digest('hex')
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({error: 'Não autorizado.'}, {status: 401})

  const parsed = inputSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({error: 'Dados da questão inválidos.'}, {status: 400})
  const data = parsed.data
  const labels = new Set(data.choices.map((choice) => choice.label.toUpperCase()))
  const correct = data.correctAnswer.toUpperCase()
  if (!labels.has(correct)) return NextResponse.json({error: 'O gabarito deve apontar para uma alternativa.'}, {status: 400})
  if (data.markedAnswer && !labels.has(data.markedAnswer.toUpperCase())) return NextResponse.json({error: 'A resposta marcada deve apontar para uma alternativa.'}, {status: 400})

  const userId = session.user.id
  const contentHash = hashQuestion(data.prompt, data.choices)
  const duplicate = await db.select({id: questions.id}).from(questions).where(and(eq(questions.userId, userId), eq(questions.contentHash, contentHash))).limit(1)
  if (duplicate[0]) return NextResponse.json({error: 'Esta questão já foi cadastrada.', questionId: duplicate[0].id}, {status: 409})

  let [worksheet] = await db.select({id: worksheets.id}).from(worksheets).where(and(eq(worksheets.userId, userId), eq(worksheets.origin, 'generated'))).orderBy(asc(worksheets.createdAt)).limit(1)
  if (!worksheet) {
    [worksheet] = await db.insert(worksheets).values({userId, title: 'Questões avulsas', sourceType: 'generated', origin: 'generated', status: 'ready'}).returning({id: worksheets.id})
  }

  const ordinalRows = await db.select({ordinal: questions.ordinal}).from(questions).where(eq(questions.worksheetId, worksheet.id)).orderBy(asc(questions.ordinal))
  const ordinal = (ordinalRows.at(-1)?.ordinal || 0) + 1
  const [question] = await db.insert(questions).values({
    userId, worksheetId: worksheet.id, ordinal, promptText: data.prompt, questionType: 'multiple_choice', origin: 'generated', correctAnswer: correct, answerSource: 'user_key', userVerified: true, contentHash,
    examBoard: data.examBoard || null, examName: data.examName || null, subject: data.subject || null,
  }).returning({id: questions.id})
  const createdChoices = await db.insert(answerChoices).values(data.choices.map((choice) => ({questionId: question.id, label: choice.label.toUpperCase(), text: choice.text, isCorrect: choice.label.toUpperCase() === correct}))).returning({id: answerChoices.id, label: answerChoices.label})
  const marked = data.markedAnswer?.toUpperCase()
  if (marked) {
    const choice = createdChoices.find((row) => row.label === marked)
    await db.insert(attempts).values({userId, questionId: question.id, selectedChoiceId: choice?.id || null, outcome: marked === correct ? 'correct' : 'wrong', source: 'markup'})
  }

  await organizeQuestionEvidence(db, {questionId: question.id, userId, prompt: data.prompt, correctAnswer: correct, markedAnswer: marked, subject: data.subject, examBoard: data.examBoard, examName: data.examName, legalReference: data.legalReference})
  return NextResponse.json({questionId: question.id}, {status: 201})
}
