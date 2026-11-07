export type ScheduledFlashcard = {status: 'draft' | 'approved' | 'archived'; dueAt: string; state: 'new' | 'learning' | 'review' | 'relearning'}

export function isFlashcardDue(card: ScheduledFlashcard, now: number) {
  return card.status === 'approved' && new Date(card.dueAt).getTime() <= now
}

export function summarizeDeck(cards: ScheduledFlashcard[], now: number) {
  const approved = cards.filter((card) => card.status === 'approved')
  return {
    new: approved.filter((card) => card.state === 'new').length,
    learning: approved.filter((card) => card.state === 'learning' || card.state === 'relearning').length,
    review: approved.filter((card) => card.state === 'review' && isFlashcardDue(card, now)).length,
    scheduled: approved.filter((card) => new Date(card.dueAt).getTime() > now).length,
  }
}
