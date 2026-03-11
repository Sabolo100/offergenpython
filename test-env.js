require('dotenv').config({ path: '.env.local' })

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL)
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET')
console.log('ANTHROPIC_API_KEY loaded:', !!process.env.ANTHROPIC_API_KEY)

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✅ Supabase connection OK')
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
