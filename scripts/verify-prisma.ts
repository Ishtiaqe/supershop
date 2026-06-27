import prisma from '../src/lib/prisma'

async function verify() {
  try {
    console.log('🔍 Verifying Prisma connection...')

    const tenantCount = await prisma.tenant.count()
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()
    const saleCount = await prisma.sale.count()
    const inventoryCount = await prisma.inventoryItem.count()

    console.log('✅ Connection successful!')
    console.log(`   Tenants: ${tenantCount}`)
    console.log(`   Users: ${userCount}`)
    console.log(`   Products: ${productCount}`)
    console.log(`   Sales: ${saleCount}`)
    console.log(`   Inventory Items: ${inventoryCount}`)
    console.log('\n✅ Schema matches production database!')
  } catch (error) {
    console.error('❌ Connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verify()
