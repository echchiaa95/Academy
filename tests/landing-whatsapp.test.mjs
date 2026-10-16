// Unit tests for the centralized WhatsApp registration configuration.
// Verifies the official number, all three language messages, and URL encoding.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'wa-test-'))
execFileSync('node_modules/.bin/esbuild', [
  'src/config/contact.ts', '--bundle', '--format=esm', `--outfile=${tmp}/contact.mjs`,
], { stdio: 'pipe' })
const { WHATSAPP_NUMBER, getWhatsAppRegistrationUrl, getWhatsAppRegistrationMessage } = await import(`${tmp}/contact.mjs`)

test('official number is normalized for wa.me URLs', () => {
  assert.equal(WHATSAPP_NUMBER, '212708818882')
})

test('every language produces a wa.me URL with the official number', () => {
  for (const lang of ['ar', 'fr', 'en']) {
    const url = getWhatsAppRegistrationUrl(lang)
    assert.ok(url.startsWith('https://wa.me/212708818882?text='), `${lang}: ${url}`)
  }
})

test('messages are language-specific and distinct', () => {
  const ar = getWhatsAppRegistrationMessage('ar')
  const fr = getWhatsAppRegistrationMessage('fr')
  const en = getWhatsAppRegistrationMessage('en')
  assert.match(ar, /السلام عليكم/)
  assert.match(ar, /Academic Profile/)
  assert.match(fr, /Bonjour/)
  assert.match(fr, /Academic Profile/)
  assert.match(en, /Hello/)
  assert.match(en, /Academic Profile/)
  assert.notEqual(ar, fr)
  assert.notEqual(fr, en)
})

test('message is properly URL-encoded (decodes back to the exact original)', () => {
  for (const lang of ['ar', 'fr', 'en']) {
    const url = getWhatsAppRegistrationUrl(lang)
    const encoded = url.split('?text=')[1]
    // raw Arabic/French characters must not leak unencoded into the URL
    assert.doesNotMatch(encoded, /[؀-ۿéèêà]/)
    assert.equal(decodeURIComponent(encoded), getWhatsAppRegistrationMessage(lang))
  }
})

test('unknown language falls back to English', () => {
  assert.equal(getWhatsAppRegistrationMessage('de'), getWhatsAppRegistrationMessage('en'))
})
