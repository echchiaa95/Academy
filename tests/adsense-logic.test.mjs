// Unit tests for the AdSense decision logic (pure function — no browser, no Supabase).
// The helper is TypeScript; we transpile it with esbuild (already a Vite dependency),
// so this test runs with plain Node 20 and zero extra dependencies.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const tmp = mkdtempSync(join(tmpdir(), 'ads-test-'))
execFileSync('node_modules/.bin/esbuild', [
  'src/components/ads/adsense-logic.ts', '--bundle', '--format=esm', `--outfile=${tmp}/logic.mjs`,
], { stdio: 'pipe' })
const { shouldLoadAds } = await import(`${tmp}/logic.mjs`)

const ON = { adsense_enabled: true, adsense_auto_ads_enabled: true, adsense_publisher_id: 'ca-pub-1234567890123456' }

test('loads when enabled + auto ads + valid publisher + tenant resolved', () => {
  assert.equal(shouldLoadAds(ON, true), true)
})
test('toggling Auto Ads OFF blocks loading (the toggle-while-open case)', () => {
  assert.equal(shouldLoadAds({ ...ON, adsense_auto_ads_enabled: false }, true), false)
})
test('AdSense disabled blocks loading', () => {
  assert.equal(shouldLoadAds({ ...ON, adsense_enabled: false }, true), false)
})
test('invalid publisher ids never load', () => {
  for (const bad of ['bad-id', 'ca-pub-123', 'ca-pub-abc', '', null, undefined, '<script>']) {
    assert.equal(shouldLoadAds({ ...ON, adsense_publisher_id: bad }, true), false)
  }
})
test('no resolved tenant never loads', () => {
  assert.equal(shouldLoadAds(ON, false), false)
  assert.equal(shouldLoadAds(null, true), false)
})
