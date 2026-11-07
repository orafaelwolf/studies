import {redirect} from 'next/navigation'

import {auth} from '@/auth'
import {STUDY_EXAMS} from '@/lib/studies-exams'

import QuestionForm from './question-form'

export const metadata = {title: 'Nova questão · Studies'}

export default async function NewQuestionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  return <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><p className="eyebrow">Questões</p><h1 className="mt-2 text-3xl font-semibold">Nova questão</h1><p className="hint max-w-2xl">Cole a questão e o gabarito. A análise cria rascunhos nos cadernos e um flashcard para sua aprovação; nenhuma referência legal é tratada como verificada sem fonte oficial.</p><QuestionForm exams={STUDY_EXAMS.map((exam) => ({nome: exam.nome, disciplinas: exam.disciplinas.map((subject) => subject.disciplina)}))} /></main>
}
