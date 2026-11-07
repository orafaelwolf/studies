import pomerode from '@/data/studies/pomerode-2026.json'
import gmbc from '@/data/studies/gmbc-2026.json'
import mentoria from '@/data/studies/mentoria-2026.json'

export type StudyTopic = {
  id: number
  disciplina: string
  eixo: string
  topico: string
  prioridade: string
  fonte: string
  origem?: string
}

export type StudyDiscipline = {
  disciplina: string
  questoes: number
  pontos: number
  topicos: number
}

export type StudyExam = {
  id: string
  nome: string
  sigla: string
  situacao: string
  banca: string | null
  edital: string | null
  prova: string | null
  questoes: number
  pontos: number
  nota: string
  fontes: Record<string, string | undefined>
  disciplinas: StudyDiscipline[]
  topicos: StudyTopic[]
}

export const STUDY_EXAMS: StudyExam[] = [pomerode, gmbc]
export const STUDY_MENTORSHIP = mentoria

export function findStudyExam(id: string): StudyExam | undefined {
  return STUDY_EXAMS.find((exam) => exam.id === id)
}
