'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'

import {parseQuestionText} from '@/lib/questions/parser'

type Choice = {label: string; text: string}
type ExamOption = {nome: string; disciplinas: string[]}

const emptyChoices = (): Choice[] => [{label: 'A', text: ''}, {label: 'B', text: ''}, {label: 'C', text: ''}, {label: 'D', text: ''}]

export default function QuestionForm({exams}: {exams: ExamOption[]}) {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [prompt, setPrompt] = useState('')
  const [choices, setChoices] = useState<Choice[]>(emptyChoices)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [markedAnswer, setMarkedAnswer] = useState('')
  const [subject, setSubject] = useState('')
  const [examBoard, setExamBoard] = useState('')
  const [examName, setExamName] = useState('')
  const [legalReference, setLegalReference] = useState('')
  const [professorComment, setProfessorComment] = useState('')
  const [questionNumber, setQuestionNumber] = useState<number | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [unclassifiedText, setUnclassifiedText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function applyParser(value: string) {
    const parsed = parseQuestionText(value)
    setPrompt(parsed.prompt)
    if (parsed.choices.length) setChoices(parsed.choices)
    setCorrectAnswer(parsed.correctAnswer || '')
    setMarkedAnswer(parsed.markedAnswer || '')
    setSubject(parsed.subject || '')
    setExamBoard(parsed.examBoard || '')
    setExamName(parsed.examName || '')
    setLegalReference(parsed.legalReference || '')
    setProfessorComment(parsed.professorComment || '')
    setQuestionNumber(parsed.questionNumber)
    setYear(parsed.year)
    setUnclassifiedText(parsed.unclassifiedText || '')
    setWarnings(parsed.warnings)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    const response = await fetch('/api/questions/manual', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({
      prompt, choices: choices.filter((choice) => choice.text.trim()), correctAnswer, markedAnswer: markedAnswer || null, subject: subject || null, examBoard: examBoard || null, examName: examName || null, legalReference: legalReference || null, professorComment: professorComment || null, questionNumber, year,
    })})
    const body = await response.json() as {error?: string}
    setBusy(false)
    if (!response.ok) { setError(body.error || 'Não foi possível cadastrar a questão.'); return }
    router.push('/cadernos'); router.refresh()
  }

  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label><span className="label">Cole sua questão completa aqui</span><textarea value={raw} onChange={(event) => setRaw(event.target.value)} onPaste={(event) => { const pasted = event.clipboardData.getData('text'); if (pasted) window.setTimeout(() => applyParser(pasted), 0) }} className="field min-h-40" placeholder="Cole o texto copiado do Qconcursos ou de outra plataforma" /><span className="hint">O parser funciona localmente, sem IA. Depois confira os campos identificados antes de salvar.</span></label>
    <button className="btn btn-secondary w-auto" type="button" onClick={() => applyParser(raw)}>Interpretar texto colado</button>
    {warnings.length > 0 && <div className="card border-warning p-3 text-sm"><strong>Confira antes de salvar:</strong><ul className="mt-1 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <label><span className="label">Enunciado identificado</span><textarea required value={prompt} onChange={(event) => setPrompt(event.target.value)} className="field min-h-32" placeholder="Enunciado" /></label>
    <div className="grid gap-3 sm:grid-cols-2">{choices.map((choice, index) => <label key={choice.label}><span className="label">Alternativa {choice.label}</span><input required className="field" value={choice.text} onChange={(event) => setChoices(choices.map((item, i) => i === index ? {...item, text: event.target.value} : item))} /></label>)}</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Gabarito</span><select required value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} className="field"><option value="">Selecione</option>{choices.filter((choice) => choice.text.trim()).map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label><label><span className="label">Resposta marcada (opcional)</span><select value={markedAnswer} onChange={(event) => setMarkedAnswer(event.target.value)} className="field"><option value="">Não respondi</option>{choices.filter((choice) => choice.text.trim()).map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Disciplina</span><input value={subject} onChange={(event) => setSubject(event.target.value)} list="studies-subjects" className="field" /></label><label><span className="label">Banca</span><input value={examBoard} onChange={(event) => setExamBoard(event.target.value)} className="field" /></label><label><span className="label">Concurso</span><input value={examName} onChange={(event) => setExamName(event.target.value)} list="studies-exams" className="field" /></label><label><span className="label">Ano</span><input value={year || ''} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)} type="number" min="1900" max="2100" className="field" /></label></div>
    <label><span className="label">Referência legal (opcional)</span><input value={legalReference} onChange={(event) => setLegalReference(event.target.value)} className="field" /></label>
    <label><span className="label">Comentário do professor (opcional)</span><textarea value={professorComment} onChange={(event) => setProfessorComment(event.target.value)} className="field min-h-28" /></label>
    {(questionNumber || unclassifiedText) && <div className="card p-3 text-sm"><strong>Prévia adicional</strong>{questionNumber && <p>Número identificado: {questionNumber}</p>}{unclassifiedText && <p className="mt-2 whitespace-pre-wrap text-muted">Texto não classificado (preservado): {unclassifiedText}</p>}</div>}
    <datalist id="studies-subjects">{[...new Set(exams.flatMap((exam) => exam.disciplinas))].map((value) => <option key={value} value={value} />)}</datalist><datalist id="studies-exams">{exams.map((exam) => <option key={exam.nome} value={exam.nome} />)}</datalist>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy} className="btn btn-primary sm:w-auto" type="submit">{busy ? 'Organizando…' : 'Cadastrar e organizar'}</button>
  </form>
}
