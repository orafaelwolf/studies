import assert from 'node:assert/strict'
import test from 'node:test'

import {normalizeImageOcrText, recognizeQuestionImage} from '@/lib/questions/image-ocr'
import {parseQuestionText} from '@/lib/questions/parser'

test('organiza alternativas em linhas de OCR sem inventar gabarito', () => {
  const ocr = 'vº Resolvi certo\nConsiderando a regência, assinale a alternativa CORRETA:\nA Primeira alternativa.\nB Segunda alternativa.\nc Terceira alternativa.\n[D Quarta alternativa.\nE Quinta alternativa.'
  const result = parseQuestionText(normalizeImageOcrText(ocr))
  assert.equal(result.prompt, 'Considerando a regência, assinale a alternativa CORRETA:')
  assert.deepEqual(result.choices.map((choice) => choice.label), ['A', 'B', 'C', 'D', 'E'])
  assert.equal(result.correctAnswer, null)
  assert.equal(result.markedAnswer, null)
})

test('não transforma letras soltas em opções sem sequência reconhecível', () => {
  assert.equal(normalizeImageOcrText('A pessoa estuda.\nB outra frase.'), 'A pessoa estuda.\nB outra frase.')
})

test('encerra o leitor de imagem mesmo se o OCR falhar', async () => {
  let terminated = false
  await assert.rejects(recognizeQuestionImage(new Blob(['test']), async () => ({recognize: async () => {throw new Error('falha')}, terminate: async () => {terminated = true}})))
  assert.equal(terminated, true)
})

test('encerra o leitor após devolver o texto extraído', async () => {
  let terminated = false
  const text = await recognizeQuestionImage(new Blob(['test']), async () => ({recognize: async () => ({data: {text: 'Pergunta?\nA Primeira\nB Segunda\nC Terceira'}}), terminate: async () => {terminated = true}}))
  assert.match(text, /A\) Primeira/)
  assert.equal(terminated, true)
})
