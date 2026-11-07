'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'

type Choice = {label: string; text: string}

export default function QuestionForm() {
  const router = useRouter()
  const [choices, setChoices] = useState<Choice[]>([{label: 'A', text: ''}, {label: 'B', text: ''}, {label: 'C', text: ''}, {label: 'D', text: ''}])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setError('')
    const response = await fetch('/api/questions/manual', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({
      prompt: form.get('prompt'), choices, correctAnswer: form.get('correctAnswer'), markedAnswer: form.get('markedAnswer') || null,
      subject: form.get('subject') || null, examBoard: form.get('examBoard') || null, examName: form.get('examName') || null, legalReference: form.get('legalReference') || null,
    })})
    const body = await response.json() as {error?: string}
    setBusy(false)
    if (!response.ok) { setError(body.error || 'Não foi possível cadastrar a questão.'); return }
    router.push('/cadernos')
    router.refresh()
  }

  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label><span className="label">Enunciado</span><textarea required name="prompt" className="field min-h-40" placeholder="Cole o enunciado completo" /></label>
    <div className="grid gap-3 sm:grid-cols-2">{choices.map((choice, index) => <label key={choice.label}><span className="label">Alternativa {choice.label}</span><input required className="field" value={choice.text} onChange={(event) => setChoices(choices.map((item, i) => i === index ? {...item, text: event.target.value} : item))} /></label>)}</div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Gabarito</span><select required name="correctAnswer" className="field"><option value="">Selecione</option>{choices.map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label><label><span className="label">Resposta marcada (opcional)</span><select name="markedAnswer" className="field"><option value="">Não respondi</option>{choices.map((choice) => <option key={choice.label}>{choice.label}</option>)}</select></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Disciplina</span><input name="subject" className="field" placeholder="Ex.: Direito Administrativo" /></label><label><span className="label">Banca</span><input name="examBoard" className="field" placeholder="Ex.: FURB" /></label><label><span className="label">Concurso</span><input name="examName" className="field" placeholder="Ex.: Câmara de Pomerode" /></label><label><span className="label">Referência legal (opcional)</span><input name="legalReference" className="field" placeholder="Ex.: art. 37 da Constituição" /></label></div>
    <p className="hint">Envio de imagem ainda não está disponível neste primeiro fluxo; use texto para manter o conteúdo editável e verificável.</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={busy} className="btn btn-primary sm:w-auto" type="submit">{busy ? 'Organizando…' : 'Cadastrar e organizar'}</button>
  </form>
}
