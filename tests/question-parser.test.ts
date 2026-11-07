import assert from 'node:assert/strict'
import test from 'node:test'

import {parseQuestionText} from '@/lib/questions/parser'

test('extrai quatro alternativas, metadados e gabarito explícito', () => {
  const result = parseQuestionText(`Questão 12\nBanca: FURB\nConcurso: Câmara de Pomerode\nAno: 2026\nDisciplina: Direito Administrativo\nSobre atos administrativos, assinale a correta.\nA) Sempre são discricionários.\nB) Podem ser vinculados.\nC) Não precisam de motivo.\nD) Não obedecem à finalidade.\nGabarito: B`)
  assert.equal(result.questionNumber, 12)
  assert.equal(result.choices.length, 4)
  assert.equal(result.correctAnswer, 'B')
  assert.equal(result.examBoard, 'FURB')
})

test('aceita cinco alternativas e marcadores com ponto ou parênteses', () => {
  const result = parseQuestionText(`Enunciado.\n(A) primeira\nB. segunda\nAlternativa C: terceira\n(D) quarta\nE) quinta\nResposta correta: (E)\nResposta marcada: B`)
  assert.deepEqual(result.choices.map((choice) => choice.label), ['A', 'B', 'C', 'D', 'E'])
  assert.equal(result.correctAnswer, 'E')
  assert.equal(result.markedAnswer, 'B')
})

test('mantém alternativas com múltiplas linhas e referências legais', () => {
  const result = parseQuestionText(`Qual alternativa está correta?\nA) Nos termos do art. 37 da Constituição,\na Administração observa princípios.\nB) Texto incorreto.\nGabarito: A`)
  assert.match(result.choices[0].text, /art\. 37/)
  assert.match(result.choices[0].text, /Administração/)
})

test('preserva comentário longo sem interpretar letras como alternativas', () => {
  const result = parseQuestionText(`Enunciado.\nA) Correta\nB) Incorreta\nGabarito: A\nComentário do professor: A alternativa A é correta. A letra B parece atraente, mas não se aplica.\nEm provas, C e D também aparecem como distrações.\nResolução: Confira o motivo antes de decorar.`)
  assert.equal(result.choices.length, 2)
  assert.match(result.professorComment || '', /letra B/)
  assert.match(result.professorComment || '', /C e D/)
})

test('separa justificativa e fundamentação legal', () => {
  const result = parseQuestionText(`Questão curta\nA) Sim\nB) Não\nJustificativa: O item deve ser lido literalmente.\nFundamentação legal: Constituição Federal, art. 5º, inciso II.\nGabarito: A`)
  assert.match(result.professorComment || '', /literalmente/)
  assert.match(result.legalReference || '', /art\. 5º/)
})

test('não inventa gabarito ausente', () => {
  const result = parseQuestionText(`Qual é a correta?\nA) Uma opção\nB) Outra opção`)
  assert.equal(result.correctAnswer, null)
  assert.ok(result.warnings.some((warning) => warning.includes('Gabarito')))
})

test('normaliza espaços e texto copiado do navegador', () => {
  const result = parseQuestionText(`  Banca:   ABC\r\n\u00a0Disciplina:  Português\r\nTexto  do enunciado.\r\n A )  opção um \r\n B ) opção dois\r\n Gabarito:  B `)
  assert.equal(result.examBoard, 'ABC')
  assert.equal(result.subject, 'Português')
  assert.equal(result.choices[0].text, 'opção um')
})

test('preserva texto inseguro em unclassifiedText sem descartar conteúdo', () => {
  const source = `Trecho copiado sem estrutura reconhecível\nA referência A não é uma alternativa.\nMaterial complementar sem resposta.`
  const result = parseQuestionText(source)
  assert.equal(result.choices.length, 0)
  assert.match(result.unclassifiedText || '', /Material complementar/)
  assert.ok(result.warnings.length > 0)
})
