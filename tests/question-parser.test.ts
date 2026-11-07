import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'

import {parseQuestionText} from '@/lib/questions/parser'

test('colagem real Q4443531 sem cabeçalhos artificiais', () => {
  const input = readFileSync('tests/fixtures/q4443531.txt', 'utf8')
  const result = parseQuestionText(input)
  assert.match(result.prompt, /^No desenvolvimento do texto, o autor desmente completamente/)
  assert.equal(result.associatedText, null)
  assert.equal(result.questionType, 'true_false')
  assert.deepEqual(result.choices.map((choice) => choice.text), ['Certo', 'Errado'])
  assert.equal(result.correctAnswer, 'ERRADO')
  assert.equal(result.answerOrigin, 'comment')
  assert.equal(result.markedAnswer, null)
  assert.equal(result.comments.length, 1)
  assert.equal(result.comments[0].author, 'Scriptor Futuri')
  assert.match(result.comments[0].text, /A função do contraste é limitar/)
  assert.doesNotMatch(result.comments[0].text, /Notificar Erro|Gabarito Comentado/)
})

test('marcadores de seção com hífen e contagem não entram no comentário', () => {
  const result = parseQuestionText('Questão sobre o tema?\nA) Primeiro\nB) Segundo\nC) Terceiro\nD) Quarto\nE) Quinto\n- comentários ( 3 )\nMaria\n08 de Novembro de 2026 às 10:00\nGabarito: E\nExplicação extensa.\n- Aulas\n- Estatísticas')
  assert.equal(result.choices.length, 5)
  assert.equal(result.comments[0].author, 'Maria')
  assert.equal(result.correctAnswer, 'E')
  assert.doesNotMatch(result.comments[0].text, /Aulas|Estatísticas/)
})

test('interpreta Q4443531 e atribui gabarito ao comentarista', () => {
  const parsed = parseQuestionText(`Q4443531\nAno: 2026 Banca: CESPE / CEBRASPE Órgão: SEDUC-AL\nDisciplina: Português\nAssunto: Interpretação de Textos\nEnunciado:\nNo desenvolvimento do texto, o autor desmente completamente a afirmação inicial de que 'A leitura está na moda' no Brasil ao confrontar as divulgações desse gosto em ascensão no meio digital e os dados de uma realidade nacional de pouco ou nenhum acesso à leitura.\nCerto\nErrado\nComentários:\nScriptor Futuri\n07 de Novembro de 2026 às 13:14\nGabarito: ERRADO\nA questão testa a compreensão do posicionamento do autor e a atenção a termos absolutos.\nO autor delimita, não desmente. Ele relativiza a afirmação inicial, restringindo seu alcance.`)
  assert.equal(parsed.code, 'Q4443531')
  assert.equal(parsed.questionType, 'true_false')
  assert.deepEqual(parsed.choices.map((c) => c.label), ['CERTO', 'ERRADO'])
  assert.equal(parsed.correctAnswer, 'ERRADO')
  assert.equal(parsed.answerOrigin, 'comment')
  assert.equal(parsed.markedAnswer, null)
  assert.equal(parsed.comments[0].author, 'Scriptor Futuri')
  assert.match(parsed.prompt, /No desenvolvimento do texto/)
  assert.doesNotMatch(parsed.prompt, /Scriptor/)
})

test('separa comentários por autor e não escolhe gabarito quando há conflito', () => {
  const parsed = parseQuestionText('Q4443531\nEnunciado de teste?\nCerto\nErrado\nComentários:\nAna Silva\n07 de Novembro de 2026 às 13:14\nGabarito: ERRADO\nPrimeira explicação.\nAulas\nProf. Bruno\n08 de Novembro de 2026 às 09:20\nGabarito: CERTO\nSegunda explicação.\nAcompanhar comentários')
  assert.equal(parsed.comments.length, 2)
  assert.equal(parsed.comments[0].author, 'Ana Silva')
  assert.equal(parsed.comments[1].kind, 'professor')
  assert.doesNotMatch(parsed.comments[0].text, /Aulas/)
  assert.equal(parsed.correctAnswer, null)
  assert.equal(parsed.markedAnswer, null)
  assert.ok(parsed.warnings.some((message) => message.includes('diferentes')))
})

test('metadados na mesma linha e texto associado explícito são preservados', () => {
  const parsed = parseQuestionText('Q4443531\nAno: 2026 Banca: CESPE / CEBRASPE Órgão: SEDUC-AL Prova: CESPE - Professor\nDisciplina: Português Assunto: Interpretação de Textos\nCargo: Professor\nTexto associado:\nTrecho efetivamente copiado.\nEnunciado:\nJulgue o item.\nCerto\nErrado\nGabarito: ERRADO')
  assert.equal(parsed.examBoard, 'CESPE / CEBRASPE')
  assert.equal(parsed.organization, 'SEDUC-AL')
  assert.equal(parsed.position, 'Professor')
  assert.equal(parsed.associatedText, 'Trecho efetivamente copiado.')
  assert.equal(parsed.prompt, 'Julgue o item.')
  assert.equal(parsed.markedAnswer, null)
})

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
