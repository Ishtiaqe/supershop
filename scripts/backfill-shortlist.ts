/**
 * One-time backfill: add every product sold in the last 30 days to the
 * shortlist if it is currently out of stock OR its total remaining stock is
 * <= 50% of the latest restock quantity.
 *
 * Authentication defaults to the integration-test account. Override via env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, BACKFILL_EMAIL, BACKFILL_PASSWORD
 *
 * Usage:
 *   npx tsx scripts/backfill-shortlist.ts
 */
import { createClient } from '@supabase/supabase-js'
import { runShortlistUpdate } from '../src/lib/api/services/shortlistScanService'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pdfqecwtuytkwkgsygca.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_ZOd02o2paEDCJLKc2Gg3Ag_nuBsubvk'
const BACKFILL_EMAIL = process.env.BACKFILL_EMAIL || 'owner@shop1.com'
const BACKFILL_PASSWORD = process.env.BACKFILL_PASSWORD || 'NFdfp@JP@N75P3J'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n=== Authenticating as ${BACKFILL_EMAIL} ===`)
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: BACKFILL_EMAIL,
    password: BACKFILL_PASSWORD,
  })
  if (authErr) throw authErr
  if (!auth.user) throw new Error('No user returned')
  console.log(`  Authenticated as ${auth.user.email} (${auth.user.id})`)

  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('id, tenantId')
    .eq('email', BACKFILL_EMAIL)
    .single()
  if (profErr) throw profErr
  if (!profile?.tenantId) throw new Error('No tenantId on profile')

  const tenantId = profile.tenantId
  const userId = profile.id
  console.log(`  Tenant: ${tenantId}`)

  const result = await runShortlistUpdate(supabase, tenantId, userId)

  console.log(`\n=== Scan result ===`)
  console.log(`  Products checked: ${result.checked}`)
  console.log(`  Added: ${result.added}`)
  console.log(`  Skipped (already in shortlist): ${result.skipped}`)

  if (result.details.length > 0) {
    console.log('\n  Added items:')
    for (const detail of result.details) {
      console.log(`    ✓ ${detail}`)
    }
  } else if (result.added === 0) {
    console.log('\n  ✅ All qualifying products are already in the shortlist. Nothing to add.')
  }

  console.log(`\n🎉 Done.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
