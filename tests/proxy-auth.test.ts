import assert from 'node:assert/strict'
import test from 'node:test'
import {encode} from 'next-auth/jwt'
import {NextRequest} from 'next/server'
import {proxy} from '@/proxy'

const secret = 'test-secret-for-proxy-authentication-12345'

async function request(path: string, claims?: Record<string, unknown>) {
  process.env.AUTH_SECRET = secret
  const cookieName = 'authjs.session-token'
  const value = claims ? await encode({token: claims, secret, salt: cookieName}) : ''
  return proxy(new NextRequest(`http://localhost:3000${path}`, {headers: value ? {cookie: `${cookieName}=${value}`} : {}}))
}

test('proxy exige sessão e preserva regras de onboarding e administração', async () => {
  assert.match((await request('/dashboard')).headers.get('location') || '', /\/signin/)
  assert.match((await request('/dashboard', {id: '1'})).headers.get('location') || '', /\/onboarding\/age/)
  assert.match((await request('/dashboard', {id: '1', hasDob: true})).headers.get('location') || '', /\/onboarding\/terms/)
  assert.equal((await request('/dashboard', {id: '1', hasDob: true, hasAcceptedTerms: true})).headers.get('x-middleware-next'), '1')
  assert.match((await request('/admin', {id: '1', role: 'student'})).headers.get('x-middleware-rewrite') || '', /\/not-found/)
  assert.equal((await request('/admin', {id: '1', role: 'admin'})).headers.get('x-middleware-next'), '1')
})

test('proxy aceita sessão segura HTTPS e rejeita token adulterado', async () => {
  process.env.AUTH_SECRET = secret
  const name = '__Secure-authjs.session-token'
  const value = await encode({token: {id: '1', hasDob: true, hasAcceptedTerms: true}, secret, salt: name})
  const valid = await proxy(new NextRequest('https://example.test/dashboard', {headers: {cookie: `${name}=${value}`}}))
  assert.equal(valid.headers.get('x-middleware-next'), '1')
  const invalid = await proxy(new NextRequest('https://example.test/dashboard', {headers: {cookie: `${name}=invalid`}}))
  assert.match(invalid.headers.get('location') || '', /\/signin/)
})
