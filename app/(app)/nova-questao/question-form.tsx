'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'

import {parseQuestionText, type ParsedQuestion} from '@/lib/questions/parser'
import {clipboardHtmlToText, clipboardImage} from '@/lib/questions/clipboard'
import {recognizeQuestionImage} from '@/lib/questions/image-ocr'

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
  const [parsed, setParsed] = useState<ParsedQuestion | null>(null)
  const [editing, setEditing] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [readingImage, setReadingImage] = useState(false)
  const [additionalComment, setAdditionalComment] = useState('')
  const [commentKind, setCommentKind] = useState<'user' | 'professor'>('user')

  async function readImage(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Escolha uma imagem PNG, JPEG ou WebP de até 10 MB.')
      return
    }
    setImageFile(file); setReadingImage(true); setError('')
    try {
      const text = await recognizeQuestionImage(file)
      if (!text.trim()) throw new Error('empty')
      setRaw(text); applyParser(text)
    } catch {
      setError('Não foi possível ler a imagem. Verifique sua conexão e tente novamente, ou cole o texto da questão.')
    } finally {
      setReadingImage(false)
    }
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (event.defaultPrevented || !event.clipboardData || readingImage || busy) return
      const image = clipboardImage(event.clipboardData)
      if (!image) return
      // Text copied from a website can include images as well. Preserve the
      // existing text-paste behavior when the clipboard contains actual text.
      if (event.clipboardData.getData('text/plain').trim()) return
      event.preventDefault()
      void readImage(image)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  function updateAdditionalComment(value: string) {
    setAdditionalComment(value)
    const matches = [...value.matchAll(/^\s*(?:gabarito|resposta correta|alternativa correta)\s*:\s*\(?(CERTO|ERRADO|[A-E])\)?\b/gim)]
    const labels = [...new Set(matches.map((match) => match[1].toUpperCase()))]
    if (!correctAnswer && labels.length === 1 && choices.some((choice) => choice.label === labels[0])) {
      setCorrectAnswer(labels[0])
      setWarnings((previous) => previous.filter((warning) => !warning.startsWith('Gabarito não identificado')))
      setParsed((previous) => previous ? {...previous, correctAnswer: labels[0], answerOrigin: 'comment'} : previous)
    }
  }

  function applyParser(value: string) {
    const parsed = parseQuestionText(value)
    setParsed(parsed)
    setPrompt(parsed.prompt)
    setChoices(parsed.choices.length ? parsed.choices : emptyChoices())
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
    if (prompt.trim().length < 5 || choices.filter((choice) => choice.text.trim()).length < 2 || !choices.some((choice) => choice.label === correctAnswer && choice.text.trim())) {
      setError('Confira o enunciado, as alternativas e o gabarito antes de salvar.')
      return
    }
    setBusy(true); setError('')
    const added = additionalComment.trim()
    const providedProfessorComment = [professorComment, commentKind === 'professor' ? added : ''].filter(Boolean).join('\n\n')
    const comments = [...(parsed?.comments || []), ...(added ? [{author: null, kind: commentKind, text: added}] : [])]
    let response: Response
    try {
      response = await fetch('/api/questions/manual', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({
      prompt, choices: choices.filter((choice) => choice.text.trim()), correctAnswer, markedAnswer: markedAnswer || null, subject: subject || null, examBoard: examBoard || null, examName: examName || null, legalReference: legalReference || null, professorComment: providedProfessorComment || null, questionNumber, year, questionType: parsed?.questionType, importSource: parsed || added ? {raw, code: parsed?.code || null, organization: parsed?.organization || null, topic: parsed?.topic || null, position: parsed?.position || null, associatedText: parsed?.associatedText || null, attemptResult: parsed?.attemptResult || null, answerOrigin: parsed?.answerOrigin || null, comments} : undefined,
      })})
    } catch {
      setBusy(false); setError('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.'); return
    }
    const body = await response.json().catch(() => ({})) as {error?: string}
    setBusy(false)
    if (!response.ok) { setError(body.error || 'Não foi possível cadastrar a questão.'); return }
    setImageFile(null); router.push('/cadernos'); router.refresh()
  }

  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label><span className="label">Imagem da questão</span><input type="file" accept="image/png,image/jpeg,image/webp" className="field" disabled={readingImage || busy} onChange={(event) => {const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void readImage(file)}} /><span className="hint">Você também pode copiar uma captura de tela e apertar ⌘V nesta página. A imagem é lida neste navegador e não é enviada nem salva no banco. A primeira leitura pode precisar baixar o modelo de português.</span></label>
    {readingImage && <p role="status" className="hint">Lendo a imagem em português…</p>}
    {imageFile && !readingImage && <p className="hint">Imagem selecionada: {imageFile.name}. Confira o texto extraído antes de salvar.</p>}
    <label hidden={Boolean(parsed)}><span className="label">Cole sua questão completa aqui</span><textarea value={raw} onChange={(event) => setRaw(event.target.value)} onBlur={() => {if (raw && !parsed) applyParser(raw)}} onPaste={(event) => { const plain = event.clipboardData.getData('text/plain'); const html = event.clipboardData.getData('text/html'); const structured = html ? clipboardHtmlToText(html) : ''; const pasted = plain.includes('\n') || !structured ? plain : structured; if (pasted) {event.preventDefault(); setRaw(pasted); applyParser(pasted)} }} className="field min-h-40" placeholder="Cole o texto copiado do Qconcursos ou de outra plataforma" /><span className="hint">Confira a prévia antes de salvar.</span></label>
    {parsed && <button className="btn btn-secondary w-auto" type="button" onClick={() => {setRaw(''); setParsed(null); setImageFile(null); setAdditionalComment(''); setPrompt(''); setChoices(emptyChoices()); setCorrectAnswer(''); setMarkedAnswer(''); setWarnings([])}}>Colar outra questão</button>}
    {parsed && <div className="card p-4 space-y-3"><p><strong>{parsed.code || 'Questão'} {year || ''}</strong> {[examBoard, examName, subject, parsed.topic].filter(Boolean).join(' · ')}</p><p className="whitespace-pre-wrap">{prompt}</p><ul>{choices.filter((choice) => choice.text).map((choice) => <li key={choice.label}>{choice.label}: {choice.text}</li>)}</ul><p>Gabarito: {correctAnswer || 'não identificado'} {parsed.answerOrigin === 'comment' ? '(informado em comentário; não confirmado como oficial)' : parsed.answerOrigin === 'explicit' ? '(explícito)' : ''}</p>{markedAnswer && <p>Resposta marcada: {markedAnswer}</p>}{parsed.professorComment && <p className="whitespace-pre-wrap">Comentário do professor: {parsed.professorComment}</p>}{parsed.comments.map((comment, index) => <p className="whitespace-pre-wrap" key={index}>Comentário {comment.author || 'sem autoria identificada'} ({comment.kind === 'professor' ? 'professor' : 'usuário'}): {comment.text}</p>)}<button className="btn btn-secondary w-auto" type="button" onClick={() => setEditing(!editing)}>{editing ? 'Fechar edição' : 'Editar campos'}</button></div>}
    {parsed?.associatedText && <p className="whitespace-pre-wrap"><strong>Texto associado:</strong> {parsed.associatedText}</p>}
    {warnings.length > 0 && <div className="card border-warning p-3 text-sm"><strong>Confira antes de salvar:</strong><ul className="mt-1 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <div className="space-y-2"><label><span className="label">Comentário adicional (opcional)</span><textarea className="field min-h-28" value={additionalComment} onChange={(event) => updateAdditionalComment(event.target.value)} placeholder="Cole o comentário do professor ou da comunidade" /></label><label><span className="label">Origem do comentário</span><select className="field" value={commentKind} onChange={(event) => setCommentKind(event.target.value === 'professor' ? 'professor' : 'user')}><option value="user">Comunidade</option><option value="professor">Professor</option></select></label><p className="hint">O comentário é armazenado como conteúdo fornecido por você, sem validação automática.</p></div>
    <div className="space-y-5"><label hidden={!editing && prompt.trim().length >= 5}><span className="label">Enunciado identificado</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="field min-h-32" placeholder="Enunciado" /></label>
    <div hidden={!editing && choices.length >= 2 && choices.every((choice) => Boolean(choice.text.trim()))}><div className="grid gap-3 sm:grid-cols-2">{choices.map((choice, index) => <label key={choice.label}><span className="label">Alternativa {choice.label}</span><textarea className="field" value={choice.text} onChange={(event) => setChoices(choices.map((item, i) => i === index ? {...item, text: event.target.value} : item))} /></label>)}</div></div>
    <div className="grid gap-4 sm:grid-cols-2"><label hidden={!editing && choices.some((choice) => choice.label === correctAnswer)}><span className="label">Gabarito</span><select value={correctAnswer} onChange={(event) => {setCorrectAnswer(event.target.value); setWarnings((previous) => previous.filter((warning) => !warning.startsWith('Gabarito não identificado') && !warning.startsWith('O gabarito informado'))); setParsed((previous) => previous ? {...previous, answerOrigin: null} : previous)}} className="field"><option value="">Selecione</option>{choices.filter((choice) => choice.text.trim()).map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label><label hidden={!editing}><span className="label">Resposta marcada (opcional)</span><select value={markedAnswer} onChange={(event) => setMarkedAnswer(event.target.value)} className="field"><option value="">Não respondi</option>{choices.filter((choice) => choice.text.trim()).map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label></div>
    <div hidden={!editing}><div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Disciplina</span><input value={subject} onChange={(event) => setSubject(event.target.value)} list="studies-subjects" className="field" /></label><label><span className="label">Banca</span><input value={examBoard} onChange={(event) => setExamBoard(event.target.value)} className="field" /></label><label><span className="label">Concurso</span><input value={examName} onChange={(event) => setExamName(event.target.value)} list="studies-exams" className="field" /></label><label><span className="label">Ano</span><input value={year || ''} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)} type="number" min="1900" max="2100" className="field" /></label></div>
    <label><span className="label">Referência legal (opcional)</span><input value={legalReference} onChange={(event) => setLegalReference(event.target.value)} className="field" /></label>
    <label><span className="label">Comentário do professor (opcional)</span><textarea value={professorComment} onChange={(event) => setProfessorComment(event.target.value)} className="field min-h-28" /></label></div>
    </div>
    {raw && <details className="card p-3 text-sm"><summary>Detalhes técnicos</summary>{questionNumber && <p>Número identificado: {questionNumber}</p>}{unclassifiedText && <p className="mt-2 whitespace-pre-wrap text-muted">Texto não classificado: {unclassifiedText}</p>}<p className="mt-2 whitespace-pre-wrap text-muted">Texto original: {raw}</p></details>}
    <datalist id="studies-subjects">{[...new Set(exams.flatMap((exam) => exam.disciplinas))].map((value) => <option key={value} value={value} />)}</datalist><datalist id="studies-exams">{exams.map((exam) => <option key={exam.nome} value={exam.nome} />)}</datalist>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy || readingImage} className="btn btn-primary sm:w-auto" type="submit">{busy ? 'Organizando…' : 'Salvar e organizar'}</button>
  </form>
}
