import {strict as assert} from 'node:assert'
import test from 'node:test'

import {STUDY_EXAMS, STUDY_MENTORSHIP} from '@/lib/studies-exams'
import {flattenTaxonomy} from '@/lib/taxonomy'

test('edital corrigido Pomerode contém 206 tópicos e pesos oficiais', () => {
  const pom = STUDY_EXAMS.find((exam) => exam.id === 'pomerode-2026')
  assert.ok(pom)
  assert.equal(pom.situacao, 'edital_publicado')
  assert.equal(pom.prova, '2026-12-13')
  assert.equal(pom.topicos.length, 206)
  assert.equal(pom.disciplinas.reduce((sum, d) => sum + d.questoes, 0), 60)
  assert.equal(pom.disciplinas.reduce((sum, d) => sum + d.pontos, 0), 10)
  for (const d of pom.disciplinas) {
    assert.equal(pom.topicos.filter((t) => t.disciplina === d.disciplina).length, d.topicos)
  }
})

test('GMBC contém 192 tópicos e pesos explicitamente hipotéticos', () => {
  const gm = STUDY_EXAMS.find((exam) => exam.id === 'gmbc-2026')
  assert.ok(gm)
  assert.equal(gm.situacao, 'planejamento_nao_oficial')
  assert.equal(gm.banca, null)
  assert.equal(gm.prova, null)
  assert.equal(gm.topicos.length, 192)
  assert.equal(gm.disciplinas.reduce((sum, d) => sum + d.questoes, 0), 50)
  assert.equal(gm.disciplinas.reduce((sum, d) => sum + d.pontos, 0), 10)
  for (const d of gm.disciplinas) {
    assert.equal(gm.topicos.filter((t) => t.disciplina === d.disciplina).length, d.topicos)
  }
})

test('taxonomia integra os currículos e mantém dados legados para compatibilidade', () => {
  const all = flattenTaxonomy()
  for (const exam of STUDY_EXAMS) {
    assert.equal(all.filter((topic) => topic.slug.startsWith(exam.id + '.') && topic.isLeaf).length, exam.topicos.length)
    assert.ok(all.some((topic) => topic.slug === exam.id && topic.depth === 0))
  }
  assert.ok(all.some((topic) => topic.slug === 'sat-math'))
})

test('mentoria preserva 180h e método exclusivo de questões/flashcards', () => {
  assert.equal(STUDY_MENTORSHIP.metodo, 'exclusivamente_questoes_e_flashcards')
  assert.equal(STUDY_MENTORSHIP.horasLiquidasPorDia, 6)
  assert.equal(STUDY_MENTORSHIP.blocos.reduce((sum, bloco) => sum + bloco.horas, 0), 180)
})
