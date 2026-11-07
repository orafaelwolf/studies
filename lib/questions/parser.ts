import {z} from 'zod'

const choiceSchema = z.object({label: z.string().regex(/^(?:[A-Z]|CERTO|ERRADO)$/), text: z.string().min(1)})

export const parsedQuestionSchema = z.object({
  questionNumber: z.number().int().positive().nullable(),
  examBoard: z.string().nullable(),
  examName: z.string().nullable(),
  year: z.number().int().min(1900).max(2100).nullable(),
  subject: z.string().nullable(),
  prompt: z.string(),
  choices: z.array(choiceSchema),
  correctAnswer: z.string().regex(/^(?:[A-Z]|CERTO|ERRADO)$/).nullable(),
  markedAnswer: z.string().regex(/^(?:[A-Z]|CERTO|ERRADO)$/).nullable(),
  code: z.string().nullable(),
  organization: z.string().nullable(),
  topic: z.string().nullable(),
  position: z.string().nullable(),
  associatedText: z.string().nullable(),
  attemptResult: z.string().nullable(),
  questionType: z.enum(['multiple_choice', 'true_false']),
  answerOrigin: z.enum(['explicit', 'comment']).nullable(),
  comments: z.array(z.object({author: z.string().nullable(), kind: z.enum(['professor', 'user']), text: z.string()})),
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

const NOISE = /^(?:[-–—•]\s*)?(?:aulas|estat[ií]sticas|meus filtros|cadernos|criar anota[cç][oõ]es|notificar erro|responder|ordenando por data|acompanhar coment[aá]rios|https?:\/\/\S+)\s*$/i
const COMMENT_HEADING = /^(?:[-–—•]\s*)?(?:coment[aá]rios?|gabarito comentado)(?:\s*\(\s*\d+\s*\))?\s*:?\s*$/i
const COMMENT_DATE = /^\d{1,2}\s+de\s+\S+\s+de\s+\d{4}(?:\s+[àa]s\s+\d{1,2}:\d{2})?/i

function splitComments(lines: string[]) {
  const comments: ParsedQuestion['comments'] = []
  let current: ParsedQuestion['comments'][number] | null = null
  const flush = () => { if (current?.text.trim()) comments.push({...current, text: current.text.trim()}); current = null }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (NOISE.test(line) || COMMENT_HEADING.test(line)) continue
    const professor = line.match(/^(?:coment[aá]rio\s+do\s+professor|professor(?:a)?)(?:\s+([^:]+))?\s*:\s*(.*)$/i)
    if (professor) {
      flush(); current = {author: professor[1]?.trim() || null, kind: 'professor', text: professor[2] || ''}; continue
    }
    if (i + 1 < lines.length && COMMENT_DATE.test(lines[i + 1])) {
      flush(); current = {author: line, kind: /^(?:prof\.?|professor(?:a)?)\b/i.test(line) ? 'professor' : 'user', text: lines[i + 1]}; i++; continue
    }
    if (!current) current = {author: null, kind: 'user', text: ''}
    current.text += (current.text ? '\n' : '') + line
  }
  flush()
  return comments
}

const HEADER = /^(?:(?:quest[aã]o\s*\d|n[ºo°.]\s*\d)|(?:banca|organizadora|institui[cç][aã]o|[oó]rg[aã]o|concurso|cargo|ano|disciplina|mat[eé]ria|assunto|gabarito|resposta correta|alternativa correta|resposta marcada|sua resposta)\s*:)/i

export function parseQuestionText(source: string): ParsedQuestion {
  const text = clean(source).replace(/[ \t]+(?=(?:Ano|Banca|Órgão|Prova|Disciplina|Assunto|Cargo|Concurso)\s*:)/gi, '\n')
  const lines = text ? text.split('\n').map(clean) : []
  const warnings: string[] = []
  const questionNumberRaw = metadata(lines, /^(?:quest[aã]o\s*)?(?:n[ºo°.]?\s*)?(\d{1,6})\s*(?:[-–—:.]|$)/i)
  const questionNumber = questionNumberRaw ? Number(questionNumberRaw) : null
  const examBoard = metadata(lines, /^(?:banca|organizadora|institui[cç][aã]o)\s*:\s*(.+)$/i)
  const examName = metadata(lines, /^(?:prova|concurso|cargo)\s*:\s*(.+)$/i) || metadata(lines, /^[oó]rg[aã]o\s*:\s*(.+)$/i)
  const organization = metadata(lines, /^[oó]rg[aã]o\s*:\s*(.+)$/i)
  const topic = metadata(lines, /^assunto\s*:\s*(.+)$/i)
  const position = metadata(lines, /^cargo\s*:\s*(.+)$/i)
  const attemptResult = metadata(lines, /^(?:resultado|resultado da tentativa)\s*:\s*(.+)$/i)
  const code = text.match(/\bQ\d{4,}\b/i)?.[0].toUpperCase() || null
  const subject = metadata(lines, /^(?:disciplina|mat[eé]ria|assunto)\s*:\s*(.+)$/i)
  const yearRaw = metadata(lines, /^(?:ano)\s*:\s*((?:19|20)\d{2})\b/i)
  const year = yearRaw ? Number(yearRaw) : null
  const commentIndex = lines.findIndex((line) => COMMENT_HEADING.test(line))
  const mainLines = commentIndex < 0 ? lines : lines.slice(0, commentIndex)
  const commentSection = commentIndex < 0 ? [] : lines.slice(commentIndex + 1)
  const answerPattern = /^(?:gabarito|resposta correta|alternativa correta)\s*:\s*(?:alternativa\s*)?\(?(CERTO|ERRADO|[A-E])\)?\b/i
  const explicitAnswer = answer(mainLines, answerPattern)
  const comments = splitComments(commentSection)
  const commentAnswers = [...new Set(comments.flatMap((comment) => comment.text.split('\n').map((line) => answer([line], answerPattern)).filter((value): value is string => Boolean(value))))]
  const commentAnswer = commentAnswers.length === 1 ? commentAnswers[0] : null
  const correctAnswer = explicitAnswer || commentAnswer
  const answerOrigin = explicitAnswer ? 'explicit' : commentAnswer ? 'comment' : null
  const markedAnswer = answer(mainLines, /^(?:resposta marcada|sua resposta)\s*:\s*(?:alternativa\s*)?\(?(CERTO|ERRADO|[A-E])\)?\b/i)
  if (commentAnswers.length > 1) warnings.push('Comentários apresentam gabaritos diferentes; confira o gabarito.')

  const choices: {label: string; text: string}[] = []
  const promptLines: string[] = []
  const associatedLines: string[] = []
  const commentLines: string[] = []
  const legalLines: string[] = []
  const unclassified: string[] = []
  let activeChoice: {label: string; text: string} | null = null
  let section: Section | null = null
  let sawChoice = false
  let inAssociatedText = false

  for (const line of mainLines) {
    if (!line) continue
    if (/^texto associado\s*:?$/i.test(line)) { inAssociatedText = true; continue }
    if (/^enunciado\s*:?$/i.test(line)) { inAssociatedText = false; continue }
    if (inAssociatedText && (/^(?:alternativas\s*:?|certo|errado)$/i.test(line) || choiceAt(line))) {
      promptLines.push(...associatedLines)
      associatedLines.length = 0
      inAssociatedText = false
    }
    if (inAssociatedText) { if (!NOISE.test(line)) associatedLines.push(line); continue }
    if (NOISE.test(line) || /^Q\d{4,}$/i.test(line) || /^alternativas\s*:?$/i.test(line)) continue
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
    if (/^(?:resultado|resultado da tentativa)\s*:/i.test(line)) continue
    if (/^(?:prova|cargo)\s*:/i.test(line)) continue
    if (/^(?:certo|errado)$/i.test(line)) {
      const label = line.toUpperCase()
      activeChoice = {label, text: label === 'CERTO' ? 'Certo' : 'Errado'}
      choices.push(activeChoice); sawChoice = true
      continue
    }
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
  if (/(?:texto associado|texto de apoio)/i.test(text) && associatedLines.length === 0) warnings.push('O texto associado não foi fornecido na colagem.')
  if (!sawChoice && text) unclassified.push(text)

  return parsedQuestionSchema.parse({
    questionNumber: Number.isInteger(questionNumber) && questionNumber && questionNumber > 0 ? questionNumber : null,
    examBoard, examName, year, subject, prompt, choices, correctAnswer, markedAnswer, code, organization, topic, position, attemptResult, associatedText: nullable(associatedLines.join('\n')), answerOrigin, comments,
    questionType: choices.some((choice) => choice.label === 'CERTO') && choices.some((choice) => choice.label === 'ERRADO') ? 'true_false' : 'multiple_choice',
    professorComment: nullable([...commentLines, ...comments.filter((comment) => comment.kind === 'professor').map((comment) => comment.text)].join('\n')),
    legalReference: nullable(legalLines.join('\n')),
    unclassifiedText: nullable(unclassified.join('\n')),
    warnings,
  })
}
