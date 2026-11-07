import assert from 'node:assert/strict'
import test from 'node:test'

import {extractLegalReferences, stableHash} from '@/lib/studies'

test('extrai referências jurídicas explícitas sem inventar dispositivos', () => {
  const refs = extractLegalReferences('CF/88, art. 37, inciso II; Lei nº 13.022/2014; § 1º.')
  assert.ok(refs.some((item) => /art\. 37/i.test(item)))
  assert.ok(refs.some((item) => /13\.022\/2014/i.test(item)))
  assert.ok(refs.some((item) => /§ 1º/.test(item)))
  assert.equal(extractLegalReferences('nenhuma referência legal explícita').length, 0)
})

test('deduplicação exata normaliza acentos, espaços e pontuação irrelevante', () => {
  assert.equal(stableHash('Revogação por conveniência'), stableHash('  revogacao   por conveniência  '))
  assert.notEqual(stableHash('Revogação por conveniência'), stableHash('Anulação por ilegalidade'))
})
