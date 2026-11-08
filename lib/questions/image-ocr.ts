/** Normalize OCR labels only when the output contains an ordered A, B, C sequence. */
export function normalizeImageOcrText(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const candidates = lines.flatMap((line, index) => {
    const match = line.match(/^\s*\[?([A-Ea-e])\]?\s+(.+)$/)
    return match ? [{index, label: match[1].toUpperCase(), text: match[2]}] : []
  })
  const start = candidates.findIndex((candidate) => candidate.label === 'A')
  const sequence: typeof candidates = []
  if (start >= 0) {
    for (const candidate of candidates.slice(start)) {
      if (candidate.label !== String.fromCharCode(65 + sequence.length)) break
      sequence.push(candidate)
      if (sequence.length === 5) break
    }
  }
  if (sequence.length >= 3) {
    for (const item of sequence) lines[item.index] = item.label + ') ' + item.text
  }
  return lines
    .map((line) => line.replace(/(?<=[.!?])\s+(?:P\s+)?reportar\s+erro\s*$/i, ''))
    .filter((line) => !/^[✓✔vº°\s]*resolvi\s+(?:certo|errado)\s*$/i.test(line.trim()) && !/^\s*(?:P\s+)?reportar\s+erro\s*$/i.test(line))
    .join('\n').trim()
}

type OcrWorker = {
  recognize: (image: Blob) => Promise<{data: {text: string}}>
  terminate: () => Promise<unknown>
}

/** Image bytes stay in the browser; only recognized text is returned. */
export async function recognizeQuestionImage(image: Blob, makeWorker?: () => Promise<OcrWorker>): Promise<string> {
  const create = makeWorker || (async () => {
    const {createWorker} = await import('tesseract.js')
    return createWorker('por')
  })
  const worker = await create()
  try {
    const result = await worker.recognize(image)
    return normalizeImageOcrText(result.data.text)
  } finally {
    await worker.terminate()
  }
}
