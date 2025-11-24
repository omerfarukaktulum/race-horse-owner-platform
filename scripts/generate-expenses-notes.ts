import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

// Expense categories
const EXPENSE_CATEGORIES = [
  'IDMAN_JOKEYI',
  'SEYIS',
  'ILAC',
  'YEM_SAMAN_OT',
  'EKSTRA_ILAC',
  'YARIS_KAYIT',
  'NAKLIYE',
  'SEZONLUK_AHIR',
  'OZEL',
] as const

// Generate random date within last 12 months
function getRandomDateInLast12Months(): Date {
  const now = new Date()
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  
  const randomTime = twelveMonthsAgo.getTime() + Math.random() * (now.getTime() - twelveMonthsAgo.getTime())
  return new Date(randomTime)
}

// Generate date relative to race date (before or after)
function getDateRelativeToRace(raceDate: Date, daysOffset: number): Date {
  const date = new Date(raceDate)
  date.setDate(date.getDate() + daysOffset)
  return date
}

// Expense templates based on category
const expenseTemplates: Record<string, { amounts: number[], notes: string[] }> = {
  IDMAN_JOKEYI: {
    amounts: [500, 600, 700, 800, 1000, 1200],
    notes: [
      'İdman jokeyi ücreti',
      'Haftalık idman jokeyi ödemesi',
      'İdman jokeyi günlük ücret',
      'Jokey idman ücreti',
    ],
  },
  SEYIS: {
    amounts: [2000, 2500, 3000, 3500, 4000],
    notes: [
      'Seyis aylık ücret',
      'Seyis maaşı',
      'Seyis ödemesi',
      'Seyis ücreti',
    ],
  },
  ILAC: {
    amounts: [150, 200, 250, 300, 400, 500],
    notes: [
      'Vitamin takviyesi',
      'Aşı ve ilaç gideri',
      'Rutin ilaç alımı',
      'Sağlık ilaçları',
    ],
  },
  YEM_SAMAN_OT: {
    amounts: [800, 1000, 1200, 1500, 2000],
    notes: [
      'Aylık yem gideri',
      'Yem ve saman alımı',
      'Ot ve yem masrafı',
      'Yem takviyesi',
    ],
  },
  EKSTRA_ILAC: {
    amounts: [300, 400, 500, 600, 800],
    notes: [
      'Özel ilaç tedavisi',
      'Ekstra vitamin takviyesi',
      'Özel bakım ilacı',
      'Tedavi ilacı',
    ],
  },
  YARIS_KAYIT: {
    amounts: [200, 250, 300, 350, 400],
    notes: [
      'Yarış kayıt ücreti',
      'Yarış kayıt masrafı',
      'Kayıt ücreti',
      'Yarış kayıt bedeli',
    ],
  },
  NAKLIYE: {
    amounts: [500, 600, 800, 1000, 1200, 1500],
    notes: [
      'Hipodrom nakliye',
      'Yarış nakliye ücreti',
      'At nakliye masrafı',
      'Nakliye gideri',
    ],
  },
  SEZONLUK_AHIR: {
    amounts: [5000, 6000, 7000, 8000, 10000],
    notes: [
      'Sezonluk ahır kirası',
      'Aylık ahır ücreti',
      'Ahır kira ödemesi',
      'Sezonluk barınma ücreti',
    ],
  },
  OZEL: {
    amounts: [300, 400, 500, 600, 800, 1000],
    notes: [
      'Özel bakım gideri',
      'Ekstra masraf',
      'Özel harcama',
      'Diğer giderler',
    ],
  },
}

// Note templates
const noteTemplates: Record<string, string[]> = {
  'Yem Takibi': [
    'Günlük yem tüketimi normal seviyede. İştahı iyi.',
    'Yem miktarı artırıldı. Performans takibi yapılıyor.',
    'Özel yem takviyesi uygulanıyor. Gelişim gözlemleniyor.',
    'Yem programı güncellendi. Atın durumu iyi.',
  ],
  'Gezinti': [
    'Sabah gezintisi yapıldı. At rahat ve sakin.',
    'Günlük gezinti rutini tamamlandı. Kondisyon iyi.',
    'Uzun gezinti yapıldı. Atın durumu mükemmel.',
    'Gezinti sonrası dinlenme. Genel durum iyi.',
  ],
  'Hastalık': [
    'Hafif öksürük gözlemlendi. Veteriner kontrolü yapıldı.',
    'Hafif burun akıntısı var. İlaç tedavisi başlatıldı.',
    'Ayak kontrolü yapıldı. Herhangi bir sorun yok.',
    'Genel sağlık kontrolü tamamlandı. Durum normal.',
  ],
  'Gelişim': [
    'Kondisyon artışı gözlemlendi. İdmanlara devam ediliyor.',
    'Performans gelişimi kaydedildi. Yarışa hazırlık sürüyor.',
    'Kas gelişimi iyi. Atın formu yükseliyor.',
    'Genel gelişim pozitif. Yarış performansı artıyor.',
  ],
  'Kilo Takibi': [
    'Günlük kilo ölçümü yapıldı. Normal seviyede.',
    'Haftalık kilo takibi tamamlandı. İdeal ağırlıkta.',
    'Kilo kontrolü yapıldı. Diyet programı uygulanıyor.',
    'Aylık kilo değerlendirmesi yapıldı. Sağlıklı seviyede.',
  ],
}

const NOTE_TEMPLATE_KEYS = Object.keys(noteTemplates) as (keyof typeof noteTemplates)[]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Simple ID generator (cuid-like)
function generateId(): string {
  return 'cl' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateExpenseSQL(
  horseId: string,
  addedById: string,
  category: string,
  date: Date,
  amount: number,
  note: string
): string {
  const dateStr = date.toISOString().replace('T', ' ').substring(0, 19)
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const id = generateId()
  
  return `INSERT INTO expenses (id, "horseId", "addedById", date, category, amount, currency, note, "createdAt", "updatedAt") VALUES ('${id}', '${horseId}', '${addedById}', '${dateStr}', '${category}', ${amount}, 'TRY', '${note.replace(/'/g, "''")}', '${now}', '${now}');`
}

function generateNoteSQL(
  horseId: string,
  addedById: string,
  date: Date,
  note: string,
  kiloValue?: number | null
): string {
  const dateStr = date.toISOString().replace('T', ' ').substring(0, 19)
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const id = generateId()
  
  const kiloValueStr =
    kiloValue !== null && kiloValue !== undefined ? kiloValue.toString() : 'NULL'
  
  return `INSERT INTO horse_notes (id, "horseId", "addedById", date, note, "kiloValue", "createdAt", "updatedAt") VALUES ('${id}', '${horseId}', '${addedById}', '${dateStr}', '${note.replace(/'/g, "''")}', ${kiloValueStr}, '${now}', '${now}');`
}

async function main() {
  console.log('Fetching database data...')
  
  // Get all owners
  const owners = await prisma.ownerProfile.findMany({
    include: {
      user: true,
      stablemate: {
        include: {
          horses: {
            include: {
              raceHistory: {
                where: {
                  raceDate: {
                    gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
                  },
                },
                orderBy: {
                  raceDate: 'desc',
                },
              },
            },
          },
        },
      },
    },
  })
  
  // Get all trainers
  const trainers = await prisma.trainerProfile.findMany({
    include: {
      user: true,
    },
  })
  
  console.log(`Found ${owners.length} owners and ${trainers.length} trainers`)
  
  const expenseSQL: string[] = []
  const noteSQL: string[] = []
  
  // Generate expenses and notes for each owner's horses
  for (const owner of owners) {
    if (!owner.stablemate?.horses) continue
    
    const ownerUserId = owner.user.id
    
    for (const horse of owner.stablemate.horses) {
      // Generate expenses based on race history
      if (horse.raceHistory && horse.raceHistory.length > 0) {
        for (const race of horse.raceHistory) {
          // Add race registration expense (before race)
          const registrationDate = getDateRelativeToRace(race.raceDate, -7)
          const regCategory = 'YARIS_KAYIT'
          const regTemplate = expenseTemplates[regCategory]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              ownerUserId,
              regCategory,
              registrationDate,
              getRandomElement(regTemplate.amounts),
              getRandomElement(regTemplate.notes)
            )
          )
          
          // Add transportation expense (before race)
          const transportDate = getDateRelativeToRace(race.raceDate, -2)
          const transCategory = 'NAKLIYE'
          const transTemplate = expenseTemplates[transCategory]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              ownerUserId,
              transCategory,
              transportDate,
              getRandomElement(transTemplate.amounts),
              getRandomElement(transTemplate.notes)
            )
          )
          
          // Add training jockey expense (before race)
          const trainingDate = getDateRelativeToRace(race.raceDate, -3)
          const trainCategory = 'IDMAN_JOKEYI'
          const trainTemplate = expenseTemplates[trainCategory]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              ownerUserId,
              trainCategory,
              trainingDate,
              getRandomElement(trainTemplate.amounts),
              getRandomElement(trainTemplate.notes)
            )
          )
          
          // Add note before race (Gelişim)
          const noteDate = getDateRelativeToRace(race.raceDate, -1)
          noteSQL.push(
            generateNoteSQL(
              horse.id,
              ownerUserId,
              noteDate,
              getRandomElement(noteTemplates['Gelişim']),
              null
            )
          )
        }
      }
      
      // Add monthly recurring expenses (random dates in last 12 months)
      const monthlyExpenses = [
        { category: 'SEYIS', count: 12 },
        { category: 'YEM_SAMAN_OT', count: 12 },
        { category: 'ILAC', count: 8 },
        { category: 'SEZONLUK_AHIR', count: 1 },
      ]
      
      for (const monthly of monthlyExpenses) {
        for (let i = 0; i < monthly.count; i++) {
          const date = getRandomDateInLast12Months()
          const template = expenseTemplates[monthly.category]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              ownerUserId,
              monthly.category,
              date,
              getRandomElement(template.amounts),
              getRandomElement(template.notes)
            )
          )
        }
      }
      
      // Add random notes
      for (let i = 0; i < 15; i++) {
        const date = getRandomDateInLast12Months()
        const category = getRandomElement([...NOTE_TEMPLATE_KEYS])
        let kiloValue: number | null = null
        if (category === 'Kilo Takibi') {
          // Horse weight: 350-500 kg
          kiloValue = Math.round((Math.random() * 150 + 350) * 10) / 10
        } else if (category === 'Yem Takibi') {
          // Daily feed amount: 5-10 kg
          kiloValue = Math.round((Math.random() * 5 + 5) * 10) / 10
        }
        noteSQL.push(
          generateNoteSQL(
            horse.id,
            ownerUserId,
            date,
            getRandomElement(noteTemplates[category]),
            kiloValue
          )
        )
      }
    }
  }
  
  // Generate expenses and notes from trainers for their assigned horses AND horses in stablemates they work with
  for (const trainer of trainers) {
    const trainerUserId = trainer.user.id
    
    // Get horses assigned to this trainer
    const trainerHorses = await prisma.horse.findMany({
      where: {
        trainerId: trainer.id,
      },
      include: {
        raceHistory: {
          where: {
            raceDate: {
              gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
            },
          },
          orderBy: {
            raceDate: 'desc',
          },
        },
      },
    })
    
    // Get all stablemates this trainer works with
    const stablemateLinks = await prisma.stablemateTrainer.findMany({
      where: {
        trainerProfileId: trainer.id,
      },
      include: {
        stablemate: {
          include: {
            horses: {
              include: {
                raceHistory: {
                  where: {
                    raceDate: {
                      gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
                    },
                  },
                  orderBy: {
                    raceDate: 'desc',
                  },
                },
              },
            },
          },
        },
      },
    })
    
    // Get all horses from stablemates this trainer works with
    const stablemateHorses: any[] = []
    for (const link of stablemateLinks) {
      if (link.stablemate?.horses) {
        stablemateHorses.push(...link.stablemate.horses)
      }
    }
    
    // Combine assigned horses and stablemate horses, removing duplicates
    const allTrainerHorses = new Map<string, any>()
    for (const horse of trainerHorses) {
      allTrainerHorses.set(horse.id, horse)
    }
    for (const horse of stablemateHorses) {
      if (!allTrainerHorses.has(horse.id)) {
        // Only add if horse has race history or we want to add random notes/expenses
        allTrainerHorses.set(horse.id, horse)
      }
    }
    
    const uniqueHorses = Array.from(allTrainerHorses.values())
    
    for (const horse of uniqueHorses) {
      // Add training-related expenses from trainer
      if (horse.raceHistory && horse.raceHistory.length > 0) {
        for (const race of horse.raceHistory) {
          // Training jockey expense
          const trainingDate = getDateRelativeToRace(race.raceDate, -5)
          const trainCategory = 'IDMAN_JOKEYI'
          const trainTemplate = expenseTemplates[trainCategory]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              trainerUserId,
              trainCategory,
              trainingDate,
              getRandomElement(trainTemplate.amounts),
              getRandomElement(trainTemplate.notes)
            )
          )
          
          // Extra medicine expense
          const medDate = getDateRelativeToRace(race.raceDate, -4)
          const medCategory = 'EKSTRA_ILAC'
          const medTemplate = expenseTemplates[medCategory]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              trainerUserId,
              medCategory,
              medDate,
              getRandomElement(medTemplate.amounts),
              getRandomElement(medTemplate.notes)
            )
          )
          
          // Note before race
          const noteDate = getDateRelativeToRace(race.raceDate, -2)
          noteSQL.push(
            generateNoteSQL(
              horse.id,
              trainerUserId,
              noteDate,
              getRandomElement(noteTemplates['Gelişim']),
              null
            )
          )
        }
      }
      
      // Add random trainer expenses for horses in stablemates they work with
      // (but not assigned to them directly)
      const isAssignedHorse = trainerHorses.some(h => h.id === horse.id)
      if (!isAssignedHorse) {
        // Add some random expenses for horses in stablemates
        for (let i = 0; i < 5; i++) {
          const date = getRandomDateInLast12Months()
          const category = getRandomElement(['IDMAN_JOKEYI', 'EKSTRA_ILAC', 'ILAC'])
          const template = expenseTemplates[category]
          expenseSQL.push(
            generateExpenseSQL(
              horse.id,
              trainerUserId,
              category,
              date,
              getRandomElement(template.amounts),
              getRandomElement(template.notes)
            )
          )
        }
      }
      
      // Add random trainer notes
      for (let i = 0; i < 10; i++) {
        const date = getRandomDateInLast12Months()
        const category = getRandomElement([...NOTE_TEMPLATE_KEYS])
        let kiloValue: number | null = null
        if (category === 'Kilo Takibi') {
          // Horse weight: 350-500 kg
          kiloValue = Math.round((Math.random() * 150 + 350) * 10) / 10
        } else if (category === 'Yem Takibi') {
          // Daily feed amount: 5-10 kg
          kiloValue = Math.round((Math.random() * 5 + 5) * 10) / 10
        }
        noteSQL.push(
          generateNoteSQL(
            horse.id,
            trainerUserId,
            date,
            getRandomElement(noteTemplates[category]),
            kiloValue
          )
        )
      }
    }
  }
  
  // Write SQL to file
  const sqlContent = `-- Generated expenses and notes for demo data
-- Generated on: ${new Date().toISOString()}

BEGIN;

-- Truncate only expenses and notes tables (base data should already exist)
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE horse_notes CASCADE;

-- Expenses (${expenseSQL.length} records)
${expenseSQL.join('\n')}

-- Notes (${noteSQL.length} records)
${noteSQL.join('\n')}

COMMIT;
`
  
  fs.writeFileSync('demo-expenses-notes.sql', sqlContent)
  console.log(`\nGenerated SQL file: demo-expenses-notes.sql`)
  console.log(`Total expenses: ${expenseSQL.length}`)
  console.log(`Total notes: ${noteSQL.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

