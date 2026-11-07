'use client'

import {useEffect, useState} from 'react'
import {isFlashcardDue} from '@/lib/flashcard-decks'

export type FlashcardRow = {id: string; front: string; back: string; deck: string; topic: string | null; status: 'draft' | 'approved' | 'archived'; dueAt: string; state: 'new' | 'learning' | 'review' | 'relearning'; sources: {questionId: string; title: string; prompt: string; exam: string | null}[]}
type Rating = 'again' | 'hard' | 'good' | 'easy'
const ratings: [Rating, string][] = [['again', 'Errei'], ['hard', 'Difícil'], ['good', 'Bom'], ['easy', 'Fácil']]

export function FlashcardList({initial, now}: {initial: FlashcardRow[]; now: number}) {
  const [cards, setCards] = useState(initial)
  const [deck, setDeck] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = cards.filter((card) => card.status !== 'archived')
  const decks = [...new Set(cards.map((card) => card.deck))].sort()
  const filtered = cards.filter((card) => (showArchived || card.status !== 'archived') && (!deck || card.deck === deck) && (!search || [card.front, card.back, card.topic].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))
  const due = filtered.filter((card) => isFlashcardDue(card, now))
  const current = due[0]

  async function update(card: FlashcardRow, status: FlashcardRow['status'], nextFront = card.front, nextBack = card.back) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/flashcards/' + card.id, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({front: nextFront, back: nextBack, status})})
      if (!response.ok) throw new Error('Não foi possível salvar o cartão.')
      setCards((all) => all.map((item) => item.id === card.id ? {...item, front: nextFront, back: nextBack, status} : item)); setEditing(null)
    } catch { setError('Não foi possível salvar o cartão.') } finally { setBusy(false) }
  }
  async function review(card: FlashcardRow, rating: Rating) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/flashcards/' + card.id + '/review', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({rating})})
      if (!response.ok) throw new Error('Falha na revisão.')
      const result = await response.json() as {dueAt: string; state: FlashcardRow['state']}
      setCards((all) => all.map((item) => item.id === card.id ? {...item, dueAt: result.dueAt, state: result.state} : item)); setRevealed(false); setCompleted((count) => count + 1)
    } catch { setError('Não foi possível registrar a revisão.') } finally { setBusy(false) }
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (!reviewing || !current || busy || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === ' ' && !revealed) {event.preventDefault(); setRevealed(true)}
      const rating = ratings[Number(event.key) - 1]
      if (revealed && rating) void review(current, rating[0])
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return <div className="mt-6 space-y-5"><label><span className="label">Baralho / disciplina</span><select className="field" value={deck} onChange={(event) => {setDeck(event.target.value); setReviewing(false); setCompleted(0)}}><option value="">Todos os baralhos</option>{decks.map((value) => <option key={value}>{value}</option>)}</select></label><div className="space-y-2">{decks.map((value) => {const group = active.filter((card) => card.deck === value && card.status === 'approved'); return <p key={value} className="text-sm">{value}: {group.filter((card) => card.state === 'new').length} novos · {group.filter((card) => card.state === 'learning' || card.state === 'relearning').length} em aprendizagem · {group.filter((card) => card.state === 'review' && new Date(card.dueAt).getTime() <= now).length} para revisão · {group.filter((card) => new Date(card.dueAt).getTime() > now).length} agendados</p>})}</div>{cards.length === 0 ? <p className="hint">Nenhum cartão cadastrado.</p> : due.length === 0 ? <p className="hint">Nenhum cartão vencido hoje.{filtered.some((card) => card.status === 'draft') ? ' Há cartões aguardando aprovação.' : ''}{filtered.some((card) => card.status === 'approved' && new Date(card.dueAt).getTime() > now) ? ' Há cartões programados para datas futuras.' : ''}</p> : <button className="btn btn-primary w-auto" onClick={() => {setReviewing(!reviewing); setRevealed(false); setCompleted(0)}}>{reviewing ? 'Encerrar revisão' : 'Iniciar revisão (' + due.length + ')'}</button>}
  {reviewing && current && <section className="card p-4"><p className="hint">Revisados: {completed} · Restantes: {due.length}</p><p className="mt-3 whitespace-pre-wrap font-medium">{current.front}</p>{revealed ? <><p className="mt-4 whitespace-pre-wrap border-t border-rule pt-3">{current.back}</p><div className="mt-4 flex flex-wrap gap-2">{ratings.map(([rating, label], index) => <button key={rating} disabled={busy} className="btn btn-secondary w-auto" onClick={() => review(current, rating)}>{label} ({index + 1})</button>)}</div></> : <button className="btn btn-secondary mt-4 w-auto" onClick={() => setRevealed(true)}>Mostrar resposta</button>}</section>}
  {error && <p role="alert" className="text-danger">{error}</p>}<label><span className="label">Buscar cartões</span><input className="field" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Mostrar arquivados</label><h2 className="text-xl font-semibold">Todos os cartões</h2>{filtered.map((card) => <details className="card p-4" key={card.id}><summary className="cursor-pointer">{card.front} <span className="text-xs text-muted">· {card.deck} · {card.status === 'draft' ? 'Rascunho' : card.status === 'archived' ? 'Arquivado' : 'Aprovado'} · {new Date(card.dueAt).toLocaleDateString('pt-BR')}</span></summary>{editing === card.id ? <div className="mt-3 space-y-3"><label><span className="label">Frente</span><textarea className="field" value={front} onChange={(event) => setFront(event.target.value)} /></label><label><span className="label">Verso</span><textarea className="field" value={back} onChange={(event) => setBack(event.target.value)} /></label><button className="btn btn-primary w-auto" disabled={busy || !front.trim() || !back.trim()} onClick={() => update(card, card.status, front, back)}>Salvar edição</button></div> : <p className="mt-3 whitespace-pre-wrap">{card.back}</p>}{card.sources.map((source) => <p key={source.questionId} className="hint">Origem: {source.title} · {source.exam || 'concurso não informado'} · {source.prompt}</p>)}<div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-secondary w-auto" onClick={() => {setEditing(card.id); setFront(card.front); setBack(card.back)}}>Editar</button>{card.status === 'draft' && <button disabled={busy} className="btn btn-primary w-auto" onClick={() => update(card, 'approved')}>Aprovar</button>}<button disabled={busy} className="btn btn-secondary w-auto" onClick={() => update(card, 'archived')}>Arquivar</button></div></details>)}</div>
}
