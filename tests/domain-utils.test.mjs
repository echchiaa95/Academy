// Unit tests for hostname normalization/validation and duplicate detection.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'dom-test-'))
execFileSync('node_modules/.bin/esbuild', [
  'src/lib/domain-utils.ts', '--bundle', '--format=esm', `--outfile=${tmp}/d.mjs`,
], { stdio: 'pipe' })
const { normalizeHostname, isValidHostname, isDuplicateHostnameError } = await import(`${tmp}/d.mjs`)

test('normalization strips scheme, path, port, credentials, trailing dot, case', () => {
  assert.equal(normalizeHostname('  HTTPS://WWW.Professor-Ahmed.COM/path?q=1#x  '), 'www.professor-ahmed.com')
  assert.equal(normalizeHostname('user:pass@example.com:8080/'), 'example.com')
  assert.equal(normalizeHostname('example.com.'), 'example.com')
  assert.equal(normalizeHostname('example.COM'), 'example.com')
})

test('valid hostnames accepted', () => {
  for (const h of ['example.com', 'www.professor-ahmed.com', 'a-b.co.uk', 'xn--nxasmq6b.example']) {
    assert.equal(isValidHostname(h), true, h)
  }
})

test('invalid hostnames rejected', () => {
  for (const h of ['', 'example', 'ex ample.com', '-bad.com', 'bad-.com', 'example.c', 'exam_ple.com', '.example.com', 'example..com']) {
    assert.equal(isValidHostname(h), false, JSON.stringify(h))
  }
  assert.equal(isValidHostname(`${'a'.repeat(64)}.com`), false) // label too long
  assert.equal(isValidHostname(`${'a'.repeat(250)}.com`), false) // too long
})

test('duplicate-key errors detected from PostgREST messages', () => {
  assert.equal(isDuplicateHostnameError('duplicate key value violates unique constraint "tenant_domains_hostname_key"'), true)
  assert.equal(isDuplicateHostnameError('23505'), true)
  assert.equal(isDuplicateHostnameError('permission denied'), false)
})
