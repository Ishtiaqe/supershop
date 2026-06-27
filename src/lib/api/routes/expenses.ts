import { supabase } from '@/lib/supabase'
import { formatResponse, generateUUID, sanitizeExpense, sanitizeUpdate } from '../utils'
import { RouteHandler } from '../types'

const getExpenseCategories: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('tenantId', tenantId)
  if (error) throw error
  return formatResponse(data)
}

const getExpenses: RouteHandler = async ({ tenantId }) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, category:expense_categories(*), employee:users(*)')
    .eq('tenantId', tenantId)
    .order('expenseDate', { ascending: false })
  if (error) throw error
  return formatResponse({ data, meta: { total: data.length } })
}

const getExpensesSummary: RouteHandler = async ({ tenantId }) => {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*, category:expense_categories(*)')
    .eq('tenantId', tenantId)
  if (error) throw error

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const categorySummaryMap = new Map<string, { amount: number; count: number }>()
  expenses.forEach(e => {
    const catName = e.category?.name || 'Other'
    const cur = categorySummaryMap.get(catName) || { amount: 0, count: 0 }
    categorySummaryMap.set(catName, { amount: cur.amount + e.amount, count: cur.count + 1 })
  })
  const categorySummary = Array.from(categorySummaryMap.entries()).map(([name, val]) => ({
    name,
    amount: val.amount,
    count: val.count
  }))
  return formatResponse({ totalAmount, totalCount: expenses.length, categorySummary })
}

const createExpenseCategory: RouteHandler = async ({ tenantId, requestData }) => {
  const catId = requestData.id || generateUUID()
  const { data: cat, error } = await supabase
    .from('expense_categories')
    .insert({
      id: catId,
      name: requestData.name,
      description: requestData.description,
      tenantId,
      updatedAt: new Date().toISOString()
    })
    .select()
    .single()
  if (error) throw error
  return formatResponse(cat)
}

const createExpense: RouteHandler = async ({ tenantId, userId, requestData }) => {
  const expenseId = requestData.id || generateUUID()
  const sanitized = {
    id: expenseId,
    ...sanitizeExpense({
      ...requestData,
      tenantId,
      employeeId: userId
    })
  }

  const { data: expense, error: expErr } = await supabase
    .from('expenses')
    .insert(sanitized)
    .select()
    .single()
  if (expErr) throw expErr

  await supabase.from('cash_box_entries').insert({
    id: generateUUID(),
    tenantId,
    entryType: 'EXPENSE_OUT',
    amount: sanitized.amount,
    note: `Expense: ${sanitized.description || 'No description'}`,
    referenceId: expense.id,
    createdById: userId,
    entryDate: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  return formatResponse(expense)
}

const updateExpenseCategory: RouteHandler = async ({ params, requestData }) => {
  const catId = params.id
  const { data: cat, error } = await supabase
    .from('expense_categories')
    .update({
      name: requestData.name,
      description: requestData.description,
      updatedAt: new Date().toISOString()
    })
    .eq('id', catId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(cat)
}

const updateExpense: RouteHandler = async ({ params, requestData }) => {
  const expId = params.id
  const sanitized = sanitizeUpdate(sanitizeExpense, requestData)
  const { data: expense, error } = await supabase
    .from('expenses')
    .update(sanitized)
    .eq('id', expId)
    .select()
    .single()
  if (error) throw error
  return formatResponse(expense)
}

const deleteExpenseCategory: RouteHandler = async ({ params }) => {
  const catId = params.id
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', catId)
  if (error) throw error
  return formatResponse({ success: true })
}

const deleteExpense: RouteHandler = async ({ params }) => {
  const expId = params.id
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expId)
  if (error) throw error
  return formatResponse({ success: true })
}

export function registerExpensesRoutes(router: { register: (method: string, pattern: string, handler: RouteHandler) => void }) {
  router.register('GET', '/expenses/categories', getExpenseCategories)
  router.register('GET', '/expenses/summary', getExpensesSummary)
  router.register('GET', '/expenses', getExpenses)
  router.register('POST', '/expenses/categories', createExpenseCategory)
  router.register('POST', '/expenses', createExpense)
  router.register('PUT', '/expenses/categories/:id', updateExpenseCategory)
  router.register('PUT', '/expenses/:id', updateExpense)
  router.register('DELETE', '/expenses/categories/:id', deleteExpenseCategory)
  router.register('DELETE', '/expenses/:id', deleteExpense)
}
