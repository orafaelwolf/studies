import assert from 'node:assert/strict'
import test from 'node:test'

import {normalizeImageOcrText, recognizeQuestionImage} from '@/lib/questions/image-ocr'
import {parseQuestionText} from '@/lib/questions/parser'
import {clipboardImage} from '@/lib/questions/clipboard'

test('captura imagem fornecida no evento de colagem sem exigir arquivo no disco', () => {
  const image = new File(['image'], 'clipboard.png', {type: 'image/png'})
  const clipboard = {items: [{kind: 'file', type: 'image/png', getAsFile: () => image}], files: []} as unknown as Pick<DataTransfer, 'items' | 'files'>
  assert.equal(clipboardImage(clipboard), image)
})

test('ignora conteúdo textual e aceita imagem exposta na lista de arquivos', () => {
  const image = new File(['image'], 'captura.png', {type: 'image/png'})
  const clipboard = {items: [{kind: 'string', type: 'text/plain'}], files: [image]} as unknown as Pick<DataTransfer, 'items' | 'files'>
  assert.equal(clipboardImage(clipboard), image)
  assert.equal(clipboardImage({items: [], files: []} as unknown as Pick<DataTransfer, 'items' | 'files'>), null)
})

test('prefere PNG quando a área de transferência oferece múltiplos formatos de imagem', () => {
  const tiff = new File(['image'], 'captura.tiff', {type: 'image/tiff'})
  const png = new File(['image'], 'captura.png', {type: 'image/png'})
  const clipboard = {items: [{kind: 'file', type: 'image/tiff', getAsFile: () => tiff}, {kind: 'file', type: 'image/png', getAsFile: () => png}], files: []} as unknown as Pick<DataTransfer, 'items' | 'files'>
  assert.equal(clipboardImage(clipboard), png)
})

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

test('remove o botão Reportar Erro do OCR sem cortar texto da questão', () => {
  const ocr = 'Pergunta?\nA Primeira alternativa.\nB Segunda alternativa.\nC Terceira alternativa. P Reportar Erro\nReportar Erro'
  const result = parseQuestionText(normalizeImageOcrText(ocr))
  assert.equal(result.choices[2].text, 'Terceira alternativa.')
  assert.doesNotMatch(normalizeImageOcrText(ocr), /reportar erro/i)
  assert.equal(normalizeImageOcrText('O servidor deve reportar erro no sistema.'), 'O servidor deve reportar erro no sistema.')
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
