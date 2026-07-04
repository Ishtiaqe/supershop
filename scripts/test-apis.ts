/**
 * API route integration test script.
 * Authenticates as owner@shop1.com and exercises every API route
 * by calling the Supabase queries that each route handler performs.
 *
 * Usage: npx tsx scripts/test-apis.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pdfqecwtuytkwkgsygca.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ZOd02o2paEDCJLKc2Gg3Ag_nuBsubvk'
const TEST_EMAIL = 'owner@shop1.com'
const TEST_PASSWORD = 'NFdfp@JP@N75P3J'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

let tenantId = ''
let userId = ''
let pass = 0
let fail = 0
const failures: string[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    pass++
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    fail++
    const msg = err?.message || String(err)
    failures.push(`${name}: ${msg}`)
    console.log(`  ✗ ${name} — ${msg}`)
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function assertArray(val: any, msg: string) {
  assert(Array.isArray(val), msg)
}

async function main() {
  console.log('\n=== Authenticating as owner@shop1.com ===')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (authErr) throw authErr
  assert(!!auth.user, 'No user returned')
  console.log(`  Authenticated as ${auth.user!.email} (${auth.user!.id})`)

  // Fetch profile to get tenantId
  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('*, tenant:tenants(*)')
    .eq('email', TEST_EMAIL)
    .single()
  if (profErr) throw profErr
  tenantId = profile.tenantId
  userId = profile.id
  assert(!!tenantId, 'No tenantId on profile')
  console.log(`  Tenant: ${tenantId}\n`)

  // ─── Customers API ───
  console.log('--- Customers API ---')

  let createdCustomerId = ''
  await test('POST /customers (create)', async () => {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        id: crypto.randomUUID(),
        tenantId,
        name: 'Test Customer',
        phone: '01700000000',
        email: 'test@example.com',
        address: '123 Test St',
        creditLimit: 5000,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    assert(!!data.id, 'No id returned')
    createdCustomerId = data.id
  })

  await test('GET /customers (list)', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenantId', tenantId)
    if (error) throw error
    assertArray(data, 'Expected array')
    assert(data!.some(c => c.id === createdCustomerId), 'Created customer not in list')
  })

  await test('GET /customers?q=test (search)', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenantId', tenantId)
      .or('name.ilike.%Test%,phone.ilike.%01700%')
    if (error) throw error
    assertArray(data, 'Expected array')
    assert(data!.length > 0, 'Search returned no results')
  })

  await test('GET /customers/:id (getById)', async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', createdCustomerId)
      .eq('tenantId', tenantId)
      .single()
    if (error) throw error
    assert(data.name === 'Test Customer', 'Name mismatch')
  })

  await test('GET /customers/:id/balance', async () => {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, dueAmount, amountPaid, totalAmount, saleTime')
      .eq('tenantId', tenantId)
      .eq('customerId', createdCustomerId)
      .gt('dueAmount', 0)
      .order('saleTime', { ascending: false })
    if (error) throw error
    const totalOutstanding = (sales || []).reduce((sum, s) => sum + (s.dueAmount || 0), 0)
    assert(totalOutstanding === 0, 'New customer should have 0 outstanding')
  })

  await test('PUT /customers/:id (update)', async () => {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: 'Updated Customer', updatedAt: new Date().toISOString() })
      .eq('id', createdCustomerId)
      .select()
      .single()
    if (error) throw error
    assert(data.name === 'Updated Customer', 'Name not updated')
  })

  await test('DELETE /customers/:id (delete)', async () => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', createdCustomerId)
    if (error) throw error
  })

  // ─── Sales API ───
  console.log('\n--- Sales API ---')

  await test('GET /sales-history (list)', async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*, inventory:inventory_items(*)), employee:users(*)')
      .eq('tenantId', tenantId)
      .order('saleTime', { ascending: false })
      .range(0, 9)
    if (error) throw error
    assertArray(data, 'Expected array')
    assert(data!.length > 0, 'No sales returned')
  })

  await test('GET /sales-history/:id (detail)', async () => {
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('tenantId', tenantId)
      .limit(1)
    assert(!!sales?.[0]?.id, 'No sale to test detail')
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*, inventory:inventory_items(*, variant:product_variants(*, product:products(*)))), employee:users(*)')
      .eq('id', sales![0].id)
      .eq('tenantId', tenantId)
      .single()
    if (error) throw error
    assert(!!data.id, 'No sale returned')
  })

  await test('GET /sales-history/analytics/summary', async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const { data: sales, error: sErr } = await supabase
      .from('sales')
      .select('totalAmount, totalProfit, saleTime')
      .eq('tenantId', tenantId)
      .gte('saleTime', cutoff.toISOString())
    if (sErr) throw sErr
    const { data: inv, error: iErr } = await supabase
      .from('inventory_items')
      .select('purchasePrice, retailPrice, quantity')
      .eq('tenantId', tenantId)
    if (iErr) throw iErr
    assert(Array.isArray(sales), 'Sales not array')
    assert(Array.isArray(inv), 'Inventory not array')
  })

  await test('GET /sales-history/analytics/graphs', async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const { data, error } = await supabase
      .from('sales')
      .select('totalAmount, totalProfit, saleTime')
      .eq('tenantId', tenantId)
      .gte('saleTime', cutoff.toISOString())
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  // ─── Inventory API ───
  console.log('\n--- Inventory API ---')

  await test('GET /inventory (list)', async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .range(0, 9)
    if (error) throw error
    assertArray(data, 'Expected array')
    assert(data!.length > 0, 'No inventory returned')
  })

  await test('GET /inventory/alerts/low-stock', async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, variant:product_variants(*, product:products(*))')
      .eq('tenantId', tenantId)
      .lte('quantity', 20)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  await test('GET /inventory/alerts/expiring', async () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, variant:product_variants(*, product:products(*))')
      .eq('tenantId', tenantId)
      .lte('expiryDate', future.toISOString())
      .gte('expiryDate', new Date().toISOString())
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  await test('GET /inventory/alerts/expired', async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, variant:product_variants(*, product:products(*))')
      .eq('tenantId', tenantId)
      .lt('expiryDate', new Date().toISOString())
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  // ─── Credits API ───
  console.log('\n--- Credits API ---')

  await test('GET /credits/summary', async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('dueAmount, customerPhone')
      .eq('tenantId', tenantId)
      .gt('dueAmount', 0)
    if (error) throw error
    const totalOutstanding = (data || []).reduce((s, x) => s + (x.dueAmount || 0), 0)
    const uniquePhones = new Set((data || []).map(s => s.customerPhone).filter(Boolean))
    assert(typeof totalOutstanding === 'number', 'totalOutstanding should be number')
    assert(typeof uniquePhones.size === 'number', 'customersWithDues should be number')
  })

  await test('GET /credits (list)', async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('customerName, customerPhone, dueAmount, saleTime, credit_payments:credit_payments(*)')
      .eq('tenantId', tenantId)
      .gt('dueAmount', 0)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  await test('GET /credits/:phone (detail)', async () => {
    // Find a sale with customerPhone
    const { data: sale } = await supabase
      .from('sales')
      .select('customerPhone')
      .eq('tenantId', tenantId)
      .not('customerPhone', 'is', null)
      .limit(1)
    if (sale?.[0]?.customerPhone) {
      const { data, error } = await supabase
        .from('sales')
        .select('*, creditPayments:credit_payments(*)')
        .eq('tenantId', tenantId)
        .eq('customerPhone', sale[0].customerPhone)
        .order('saleTime', { ascending: false })
      if (error) throw error
      assertArray(data, 'Expected array')
    } else {
      console.log('    (skipped — no sales with customerPhone)')
    }
  })

  // ─── Cash Box API ───
  console.log('\n--- Cash Box API ---')

  await test('GET /cash-box/summary', async () => {
    const { data, error } = await supabase
      .from('cash_box_entries')
      .select('*')
      .eq('tenantId', tenantId)
    if (error) throw error
    assertArray(data, 'Expected array')
    let cashIn = 0, cashOut = 0
    const inTypes = ['SALE_IN', 'MANUAL_IN', 'NEW_INVESTMENT_IN', 'LOAN_IN', 'CREDIT_PAYMENT_IN']
    data!.forEach(e => {
      if (inTypes.includes(e.entryType)) cashIn += e.amount
      else cashOut += e.amount
    })
    assert(typeof cashIn === 'number', 'cashIn should be number')
  })

  await test('GET /cash-box/entries (with user join)', async () => {
    const { data, error } = await supabase
      .from('cash_box_entries')
      .select('*, createdBy:users(id, fullName)')
      .eq('tenantId', tenantId)
      .order('entryDate', { ascending: false })
      .range(0, 99)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  // ─── Stock Movements API ───
  console.log('\n--- Stock Movements API ---')

  await test('GET /stock-movements (list)', async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, inventory:inventory_items(id, itemName, batchNo)')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false })
      .range(0, 99)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  let testInventoryId = ''
  await test('POST /stock-movements/adjustment', async () => {
    const { data: inv } = await supabase
      .from('inventory_items')
      .select('id, quantity')
      .eq('tenantId', tenantId)
      .limit(1)
    assert(!!inv?.[0]?.id, 'No inventory item to test')
    testInventoryId = inv![0].id
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        id: crypto.randomUUID(),
        tenantId,
        inventoryId: testInventoryId,
        movementType: 'ADJUSTMENT',
        quantityChange: 0,
        reason: 'API test adjustment',
        referenceId: null,
      })
      .select()
      .single()
    if (error) throw error
    assert(!!data.id, 'No movement returned')
    // Cleanup
    await supabase.from('stock_movements').delete().eq('id', data.id)
  })

  // ─── Sale Returns API ───
  console.log('\n--- Sale Returns API ---')

  await test('GET /sale-returns (list)', async () => {
    const { data, error } = await supabase
      .from('sale_returns')
      .select('*, items:sale_return_items(*), sale:sales(*), createdBy:users(*)')
      .eq('tenantId', tenantId)
      .order('returnDate', { ascending: false })
      .range(0, 49)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  // ─── Expenses API ───
  console.log('\n--- Expenses API ---')

  await test('GET /expenses/categories', async () => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('tenantId', tenantId)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  await test('GET /expenses (list)', async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .eq('tenantId', tenantId)
      .order('expenseDate', { ascending: false })
      .range(0, 49)
    if (error) throw error
    assertArray(data, 'Expected array')
  })

  // ─── Auth/User API ───
  console.log('\n--- Auth/User API ---')

  await test('GET /users/me', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*, tenant:tenants(*)')
      .eq('id', userId)
      .single()
    if (error) throw error
    assert(data.email === TEST_EMAIL, 'Email mismatch')
  })

  // ─── Results ───
  console.log('\n=== RESULTS ===')
  console.log(`  Passed: ${pass}`)
  console.log(`  Failed: ${fail}`)
  if (failures.length > 0) {
    console.log('\n  Failures:')
    failures.forEach(f => console.log(`    - ${f}`))
  }
  console.log('')

  await supabase.auth.signOut()
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
