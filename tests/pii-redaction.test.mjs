import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const script = await readFile(new URL('../public/scamlens/js/pii-redaction.js', import.meta.url), 'utf8')
const sandbox = { window: {} }
vm.runInNewContext(script, sandbox)
const redactPII = sandbox.window.ScamLens.redactPII

test('redacts phone numbers and email addresses', () => {
  const result = redactPII('Call 0791234567 or email zain@example.com.')
  assert.equal(result.text, 'Call [PHONE] or email [EMAIL].')
  assert.equal(result.changed, true)
})

test('redacts IBAN and valid payment card numbers', () => {
  const result = redactPII('IBAN JO94CBJO0010000000000131000302 card 4111 1111 1111 1111')
  assert.equal(result.text, 'IBAN [IBAN] card [CARD]')
})

test('redacts labeled password, OTP, ID, and recognizable API key values', () => {
  const result = redactPII('password: hunter2 OTP: 123456 national ID: 987654321 sk-abcdefghijklmnopqrstuvwxyz')
  assert.equal(result.text, 'password: [PASSWORD] OTP: [OTP] national ID: [ID] [API_KEY]')
})

test('preserves ordinary amounts, dates, URLs, and suspicious links', () => {
  const input = 'You won 500 JD on 2026-08-09. Visit https://secure-bank-verify.co/login?ref=8821 now.'
  const result = redactPII(input)
  assert.equal(result.text, input)
  assert.equal(result.changed, false)
})

test('supports Arabic and mixed Arabic/English text', () => {
  const result = redactPII('رمز التحقق: 123456، البريد zain@example.com، visit https://example.com')
  assert.equal(result.text, 'رمز التحقق: [OTP]، البريد [EMAIL]، visit https://example.com')
})