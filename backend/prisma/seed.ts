import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding default users...')

  // Super admin
  const superAdminEmail = 'admin@supershop.com'
  const superAdminPassword = 'Admin123!'

  const existingAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } })
  if (!existingAdmin) {
    const hashed = await bcrypt.hash(superAdminPassword, 10)
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashed,
        fullName: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    })
    console.log(`Created super admin: ${superAdminEmail} / ${superAdminPassword}`)
  } else {
    console.log('Super admin already exists:', superAdminEmail)
  }

  // Example owner for a sample store
  const ownerEmail = 'owner@shop1.com'
  const ownerPassword = 'Owner123!'

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } })
  if (!existingOwner) {
    const hashed = await bcrypt.hash(ownerPassword, 10)
    await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hashed,
        fullName: 'Store Owner',
        role: 'OWNER',
      },
    })
    console.log(`Created owner: ${ownerEmail} / ${ownerPassword}`)
  } else {
    console.log('Owner already exists:', ownerEmail)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
