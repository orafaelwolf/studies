import {z} from 'zod'

const choiceSchema = z.object({label: z.string().regex(/^[A-Z]$/), text: z.string().min(1)})

export const parsedQuestionSchema = z.object({
  questionNumber: z.number().int().positive().nullable(),
  examBoard: z.string().nullable(),
  examName: z.string().nullable(),
  year: z.number().int().min(1900).max(2100).nullable(),
  subject: z.string().nullable(),
  prompt: z.string(),
  choices: z.array(choiceSchema),
  correctAnswer: z.string().regex(/^[A-Z]$/).nullable(),
  markedAnswer: z.string().regex(/^[A-Z]$/).nullable(),
  professorComment: z.string().nullable(),
  legalReference: z.string().nullable(),
  unclassifiedText: z.string().nullable(),
  warnings: z.array(z.string()),
})

export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>

type Section = 'comment' | 'legal' | 'other'

function clean(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').trim()
}

function nullable(value: string) {
  const text = clean(value)
  return text || null
}

function metadata(lines: string[], expression: RegExp) {
  for (const line of lines) {
    const match = line.match(expression)
    if (match?.[1]) return clean(match[1])
  }
  return null
}

function answer(lines: string[], expression: RegExp) {
  for (const line of lines) {
    const match = line.match(expression)
    if (match?.[1]) return match[1].toUpperCase()
  }
  return null
}

function sectionAt(line: string): Section | null {
  if (/^(?:coment[aá]rio(?:s)?(?: do professor)?|resolu[cç][aã]o|justificativa)\s*:/i.test(line)) return 'comment'
  if (/^(?:fundamenta[cç][aã]o|refer[eê]ncia) legal\s*:/i.test(line)) return 'legal'
  if (/^(?:observa[cç][aã]o|nota)\s*:/i.test(line)) return 'other'
  return null
}

function choiceAt(line: string) {
  const match = line.match(/^\s*(?:alternativa\s+)?(?:\(?([A-Ea-e])\)?\s*[).:]|([A-Ea-e])\s*[-–—])\s*(.+)$/i)
  const label = match?.[1] || match?.[2]
  if (!label || !match?.[3]) return null
  return {label: label.toUpperCase(), text: clean(match[3])}
}

const HEADER = /^(?:quest[aã]o|n[ºo°.]|banca|organizadora|institui[cç][aã]o|[oó]rg[aã]o|concurso|cargo|ano|disciplina|mat[eé]ria|assunto|gabarito|resposta correta|alternativa correta|resposta marcada|sua resposta)\b/i

export function parseQuestionText(source: string): ParsedQuestion {
  const text = clean(source)
  const lines = text ? text.split('\n').map(clean).filter(Boolean) : []
  const warnings: string[] = []
  const questionNumberRaw = metadata(lines, /^(?:quest[aã]o\s*)?(?:n[ºo°.]?\s*)?(\d{1,6})\s*(?:[-–—:.]|$)/i)
  const questionNumber = questionNumberRaw ? Number(questionNumberRaw) : null
  const examBoard = metadata(lines, /^(?:banca|organizadora|institui[cç][aã]o)\s*:\s*(.+)$/i)
  const examName = metadata(lines, /^(?:[oó]rg[aã]o|concurso|cargo)\s*:\s*(.+)$/i)
  const subject = metadata(lines, /^(?:disciplina|mat[eé]ria|assunto)\s*:\s*(.+)$/i)
  const yearRaw = metadata(lines, /^(?:ano)\s*:\s*((?:19|20)\d{2})\b/i)
  const year = yearRaw ? Number(yearRaw) : null
  const correctAnswer = answer(lines, /^(?:gabarito|resposta correta|alternativa correta)\s*:\s*(?:alternativa\s*)?\(?([A-E])\)?\b/i)
  const markedAnswer = answer(lines, /^(?:resposta marcada|sua resposta)\s*:\s*(?:alternativa\s*)?\(?([A-E])\)?\b/i)

  const choices: {label: string; text: string}[] = []
  const promptLines: string[] = []
  const commentLines: string[] = []
  const legalLines: string[] = []
  const unclassified: string[] = []
  let activeChoice: {label: string; text: string} | null = null
  let section: Section | null = null
  let sawChoice = false

  for (const line of lines) {
    const nextSection = sectionAt(line)
    if (nextSection) {
      section = nextSection
      activeChoice = null
      const remainder = line.replace(/^[^:]+:\s*/, '')
      if (remainder) {
        if (section === 'comment') commentLines.push(remainder)
        else if (section === 'legal') legalLines.push(remainder)
        else unclassified.push(remainder)
      }
      continue
    }
    if (section) {
      if (section === 'comment') commentLines.push(line)
      else if (section === 'legal') legalLines.push(line)
      else unclassified.push(line)
      continue
    }
    if (HEADER.test(line)) continue
    const choice = choiceAt(line)
    if (choice) {
      sawChoice = true
      activeChoice = choice
      choices.push(activeChoice)
      continue
    }
    if (activeChoice) {
      activeChoice.text = clean(activeChoice.text + '\n' + line)
    } else {
      promptLines.push(line)
    }
  }

  if (!sawChoice) warnings.push('Nenhuma alternativa foi identificada com segurança; revise o texto manualmente.')
  if (!correctAnswer) warnings.push('Gabarito não identificado: informe-o manualmente antes de salvar.')
  if (correctAnswer && !choices.some((choice) => choice.label === correctAnswer)) warnings.push('O gabarito informado não corresponde a uma alternativa identificada.')
  if (markedAnswer && !choices.some((choice) => choice.label === markedAnswer)) warnings.push('A resposta marcada não corresponde a uma alternativa identificada.')
  if (!text) warnings.push('Cole o texto integral da questão para iniciar a interpretação.')

  const prompt = clean(promptLines.join('\n'))
  if (!prompt && text) warnings.push('Enunciado não identificado com segurança; revise o campo manualmente.')
  if (!sawChoice && text) unclassified.push(text)

  return parsedQuestionSchema.parse({
    questionNumber: Number.isInteger(questionNumber) && questionNumber && questionNumber > 0 ? questionNumber : null,
    examBoard, examName, year, subject, prompt, choices, correctAnswer, markedAnswer,
    professorComment: nullable(commentLines.join('\n')),
    legalReference: nullable(legalLines.join('\n')),
    unclassifiedText: nullable(unclassified.join('\n')),
    warnings,
  })
}
