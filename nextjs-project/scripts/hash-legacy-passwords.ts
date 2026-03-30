import dotenv from 'dotenv'
import { prisma } from '../src/lib/prisma'
import { hashPassword, isBcryptHash } from '../src/lib/password'

dotenv.config()

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      password: true,
    },
  })

  const legacyUsers = users.filter((user) => !isBcryptHash(user.password))

  console.log(`[hash-legacy-passwords] Found ${legacyUsers.length} legacy users`)
  if (legacyUsers.length === 0) return

  if (dryRun) {
    for (const user of legacyUsers) {
      console.log(`[hash-legacy-passwords] would migrate ${user.email}`)
    }
    return
  }

  for (const user of legacyUsers) {
    const passwordHash = await hashPassword(user.password)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        sessionVersion: {
          increment: 1,
        },
      },
    })
    console.log(`[hash-legacy-passwords] migrated ${user.email}`)
  }
}

main()
  .catch((error) => {
    console.error('[hash-legacy-passwords] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
