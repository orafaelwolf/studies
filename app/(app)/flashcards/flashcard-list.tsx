'use client'

import {useState} from 'react'

export type FlashcardRow = {id: string; front: string; back: string; deck: string; status: 'draft' | 'approved' | 'archived'; dueAt: string}

export function FlashcardList({initial}: {initial: FlashcardRow[]}) {
  const [cards, setCards] = useState(initial)
  const [revealed, setRevealed] = useState<string | null>(null)
  async function update(card: FlashcardRow, status: FlashcardRow['status']) { const response = await fetch('/api/flashcards/' + card.id, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({...card, status})}); if (response.ok) setCards(cards.map((item) => item.id === card.id ? {...item, status} : item)) }
  async function review(card: FlashcardRow, rating: string) { const response = await fetch('/api/flashcards/' + card.id + '/review', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({rating})}); if (response.ok) setCards(cards.filter((item) => item.id !== card.id)) }
  return <div className="mt-6 space-y-4">{cards.length === 0 ? <p className="text-sm text-muted">Nenhum flashcard para revisar.</p> : cards.map((card) => <article key={card.id} className="card p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">{card.deck} · {card.status === 'draft' ? 'Aguardando aprovação' : 'Aprovado'}</span>{card.status === 'draft' && <button className="btn btn-primary w-auto" onClick={() => update(card, 'approved')}>Aprovar</button>}</div><p className="mt-3 font-medium">{card.front}</p>{revealed === card.id ? <><p className="mt-4 whitespace-pre-wrap border-t border-rule pt-3">{card.back}</p>{card.status === 'approved' && <div className="mt-4 flex flex-wrap gap-2">{['again', 'hard', 'good', 'easy'].map((rating) => <button key={rating} className="btn btn-secondary w-auto capitalize" onClick={() => review(card, rating)}>{rating === 'again' ? 'Errei' : rating === 'hard' ? 'Difícil' : rating === 'good' ? 'Bom' : 'Fácil'}</button>)}</div>}</> : <button className="btn btn-secondary mt-4 w-auto" onClick={() => setRevealed(card.id)}>Mostrar resposta</button>}</article>)}</div>
}
