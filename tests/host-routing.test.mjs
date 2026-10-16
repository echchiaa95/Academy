// Unit tests for hostname classification — the decision that routes the root
// path to the marketing landing page (platform hosts) or to the tenant's
// academic website (custom hostnames).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'host-test-'))
execFileSync('node_modules/.bin/esbuild', [
  'src/lib/tenant.ts', '--bundle', '--format=esm', '--alias:@=./src',
  '--define:import.meta.env={}', // no env needed for pure host classification
  `--outfile=${tmp}/tenant.mjs`,
], { stdio: 'pipe' })
const { isPlatformHost } = await import(`${tmp}/tenant.mjs`)

test('platform hosts serve the marketing landing page at /', () => {
  for (const h of ['echchiaa95.github.io', 'www.github.io', 'localhost', '127.0.0.1', 'x.kimi.link', 'y.app.github.dev']) {
    assert.equal(isPlatformHost(h), true, h)
  }
})

test('custom customer hostnames serve the tenant website at /', () => {
  for (const h of ['echchiaa.elbordiji.com', 'elbordiji.com', 'prof-ahmed.com', 'www.university.ac.ma']) {
    assert.equal(isPlatformHost(h), false, h)
  }
})

test('github.io lookalikes do not escape classification', () => {
  assert.equal(isPlatformHost('github.io.evil.com'), false)
  assert.equal(isPlatformHost('notgithub.io'), false)
})
