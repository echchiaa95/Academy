// Unit tests for tenant public URL generation and slug safety.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'tu-test-'))
execFileSync('node_modules/.bin/esbuild', [
  'src/lib/tenant-url.ts', '--bundle', '--format=esm', `--outfile=${tmp}/tu.mjs`,
], { stdio: 'pipe' })
const { isSafeSlug, getAppBaseUrl, getTenantPublicUrl } = await import(`${tmp}/tu.mjs`)

const ghPages = { origin: 'https://echchiaa95.github.io', pathname: '/Academy/' }

test('tenant URL respects the /Academy/ base and uses hash routing', () => {
  assert.equal(getTenantPublicUrl('ahmed', ghPages), 'https://echchiaa95.github.io/Academy/#/profile/ahmed')
})

test('index.html suffix is stripped from the base', () => {
  const loc = { origin: 'https://echchiaa95.github.io', pathname: '/Academy/index.html' }
  assert.equal(getTenantPublicUrl('ahmed', loc), 'https://echchiaa95.github.io/Academy/#/profile/ahmed')
})

test('never produces URLs pointing at the domain root', () => {
  assert.ok(!getTenantPublicUrl('ahmed', ghPages).startsWith('https://echchiaa95.github.io/#'))
})

test('arabic slugs are percent-encoded in URLs but valid', () => {
  assert.equal(isSafeSlug('حميد'), true)
  const url = getTenantPublicUrl('حميد', ghPages)
  assert.ok(url.includes('#/profile/%D8%AD%D9%85%D9%8A%D8%AF'))
})

test('slug safety rejects traversal, separators, whitespace and length abuse', () => {
  for (const bad of ['', '..', 'a/../b', 'a/b', 'a b', 'a?b', 'a#b', 'a%b', 'a.b', 'x'.repeat(81)]) {
    assert.equal(isSafeSlug(bad), false, JSON.stringify(bad))
  }
  for (const good of ['ahmed', 'mohamed-2', 'حميد', 'محمد-سالم']) {
    assert.equal(isSafeSlug(good), true, good)
  }
})

test('getAppBaseUrl keeps subpath deployments intact', () => {
  assert.equal(getAppBaseUrl({ origin: 'http://localhost', pathname: '/Academy/' }), 'http://localhost/Academy/')
})
