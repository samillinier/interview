import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const clean = (r) => { const o = {}; for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'bigint' ? v.toString() : v; return o }

async function main() {
  console.log('=== INDEXES on hot tables ===')
  const idx = await prisma.$queryRawUnsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('WebsiteChat','WebsiteChatMessage','Notification','GpsPosition','Installer','Interview')
    ORDER BY tablename, indexname
  `)
  for (const r of idx) console.log(clean(r))

  console.log('\n=== SLOW / HEAVY STATS per table (seq scans) ===')
  const scans = await prisma.$queryRawUnsafe(`
    SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del
    FROM pg_stat_user_tables
    WHERE relname IN ('WebsiteChat','WebsiteChatMessage','Notification','GpsPosition','Installer','Interview','Contact','TravelRequest','OfficeSupplyOrder','PadOrder')
    ORDER BY seq_tup_read DESC
  `)
  for (const r of scans) console.log(clean(r))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
