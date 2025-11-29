/**
 * Script to create an admin user in the database
 * Usage: npx tsx scripts/create-admin-user.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'omer@nordiys.se'
  const password = '123123123'
  const role = 'ADMIN'

  console.log('Creating admin user...')
  console.log('Email:', email)
  console.log('Role:', role)

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log('User already exists!')
    console.log('Updating to ADMIN role...')
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Update user to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: 'ADMIN',
      },
    })
    
    console.log('✅ User updated to ADMIN:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    })
  } else {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
      },
    })
    
    console.log('✅ Admin user created:', {
      id: user.id,
      email: user.email,
      role: user.role,
    })
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

