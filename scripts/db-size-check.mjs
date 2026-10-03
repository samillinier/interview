import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const clean = (r) => {
  const o = {}
  for (const [k, v] of Object.entries(r)) o[k] = typeof v === 'bigint' ? v.toString() : v
  return o
}

async function main() {
  console.log('=== BIGGEST TABLES (by size, with approx rows) ===')
  const tables = await prisma.$queryRawUnsafe(`
    SELECT
      s.schemaname || '.' || s.relname AS table_name,
      pg_size_pretty(pg_total_relation_size(s.relid)) AS total_size,
      pg_size_pretty(pg_relation_size(s.relid)) AS table_size,
      pg_size_pretty(pg_indexes_size(s.relid)) AS indexes_size,
      st.n_live_tup AS approx_rows
    FROM pg_catalog.pg_statio_user_tables s
    LEFT JOIN pg_stat_user_tables st ON st.relid = s.relid
    ORDER BY pg_total_relation_size(s.relid) DESC
    LIMIT 25
  `)
  for (const r of tables) console.log(JSON.stringify(clean(r)))

  console.log('\n=== ROW COUNTS (key high-churn tables) ===')
  const counts = await prisma.$queryRawUnsafe(`
    SELECT 'GpsPosition' AS tbl, count(*) AS n FROM "GpsPosition"
    UNION ALL SELECT 'GpsDevice', count(*) FROM "GpsDevice"
    UNION ALL SELECT 'WebsiteChat', count(*) FROM "WebsiteChat"
    UNION ALL SELECT 'MarketingLead', count(*) FROM "MarketingLead"
    UNION ALL SELECT 'InstallerTracking', count(*) FROM "InstallerTracking"
  `)
  for (const r of counts) console.log(JSON.stringify(clean(r)))

  console.log('\n=== ACTIVE CONNECTIONS / ACTIVITY ===')
  const activity = await prisma.$queryRawUnsafe(`
    SELECT pid, state, wait_event_type, left(query, 120) AS query
    FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid()
  `)
  for (const r of activity) console.log(JSON.stringify(clean(r)))

  console.log('\n=== DB-LEVEL STATS (transactions, WAL-ish) ===')
  const dbstats = await prisma.$queryRawUnsafe(`
    SELECT
      datname,
      numbackends,
      xact_commit,
      xact_rollback,
      blks_read,
      blks_hit,
      tup_returned,
      tup_fetched,
      tup_inserted,
      tup_updated,
      tup_deleted
    FROM pg_stat_database
    WHERE datname = current_database()
  `)
  for (const r of dbstats) console.log(JSON.stringify(clean(r)))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
