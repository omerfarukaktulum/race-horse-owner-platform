import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Seed Racecourses
  const racecourses = [
    'İstanbul',
    'Ankara',
    'İzmir',
    'Bursa',
    'Şanlıurfa',
    'Diyarbakır',
    'Kocaeli',
    'Adana',
    'Elazığ',
    'Antalya',
    'Gaziantep',
    'Konya',
    'Samsun',
  ]

  for (const name of racecourses) {
    await prisma.racecourse.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log(`✓ Created ${racecourses.length} racecourses`)

  // Seed Farms
  const farms = [
    { name: 'Karadeniz Haras', city: 'İstanbul' },
    { name: 'Sultan Haras', city: 'Ankara' },
    { name: 'Ege Çiftliği', city: 'İzmir' },
    { name: 'Anadolu Haras', city: 'Konya' },
    { name: 'Marmara Çiftliği', city: 'Bursa' },
  ]

  for (const farm of farms) {
    await prisma.farm.upsert({
      where: { name: farm.name },
      update: {},
      create: farm,
    })
  }

  console.log(`✓ Created ${farms.length} farms`)

  // Seed Admin User
  const adminEmail = 'admin@tjk-stablemate.com'
  const adminPassword = await bcrypt.hash('admin123456', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log(`✓ Created admin user: ${adminEmail}`)

  // Seed Demo Owner
  const ownerEmail = 'demo@owner.com'
  const ownerPassword = await bcrypt.hash('owner123456', 12)

  const ownerUser = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: ownerPassword,
      role: 'OWNER',
      ownerProfile: {
        create: {
          officialName: 'DEMO SAHİP',
          officialRef: 'demo-ref-001',
          stablemate: {
            create: {
              name: 'Demo Eküri',
              foundationYear: 2020,
              location: 'İstanbul',
            },
          },
        },
      },
    },
  })

  console.log(`✓ Created demo owner: ${ownerEmail}`)

  // Seed Demo Trainer
  const trainerEmail = 'demo@trainer.com'
  const trainerPassword = await bcrypt.hash('trainer123456', 12)

  const trainerUser = await prisma.user.upsert({
    where: { email: trainerEmail },
    update: {},
    create: {
      email: trainerEmail,
      passwordHash: trainerPassword,
      role: 'TRAINER',
      trainerProfile: {
        create: {
          fullName: 'Ahmet Yılmaz',
          phone: '+90 555 123 4567',
        },
      },
    },
  })

  console.log(`✓ Created demo trainer: ${trainerEmail}`)

  console.log('✓ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

