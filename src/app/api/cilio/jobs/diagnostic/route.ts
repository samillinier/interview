import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs/diagnostic
 * Diagnostic endpoint to test raw Cilio API connectivity from Vercel's environment.
 */
export async function GET(request: NextRequest) {
  const key = process.env.CILIO_SUBSCRIPTION_KEY || ""
  const baseUrl = process.env.CILIO_API_BASE_URL || ""

  // Test 1: Call without any date filters
  const noFilter = await cilio.searchJobs({}).catch((e: any) => ({ error: e?.message || String(e) }))

  // Test 2: Call with last 7 days
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 86400000)
  const withDates = await cilio.searchJobs({
    orderModifiedDateStart: start.toISOString(),
    orderModifiedDateEnd: end.toISOString(),
  }).catch((e: any) => ({ error: e?.message || String(e) }))

  // Test 3: Same as searchAllJobs — 3-month window with page/pageSize
  const start3m = new Date(end)
  start3m.setMonth(start3m.getMonth() - 3)
  const paginated = await cilio.searchJobs({
    orderModifiedDateStart: start3m.toISOString(),
    orderModifiedDateEnd: end.toISOString(),
    page: 1,
    pageSize: 100,
  }).catch((e: any) => ({ error: e?.message || String(e) }))

  // Test 4: 3-month window WITHOUT pagination params
  const wideNoPage = await cilio.searchJobs({
    orderModifiedDateStart: start3m.toISOString(),
    orderModifiedDateEnd: end.toISOString(),
  }).catch((e: any) => ({ error: e?.message || String(e) }))

  // Test 5: Raw calls to test different pagination param formats
  interface SearchResult { count: number; hasXTotalCount: string | null; xPagination: string | null; linkHeader: string | null; sample1: number | null }
  async function rawSearch(extraParams: Record<string, string>): Promise<SearchResult> {
    const url = new URL(`${baseUrl}/job/search`)
    url.searchParams.set("OrderModifiedDateStart", start3m.toISOString())
    url.searchParams.set("OrderModifiedDateEnd", end.toISOString())
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.set(k, v)
    }
    const query = url.searchParams.toString().replace(/%3A/g, ":")
    const res = await fetch(`${baseUrl}/job/search?${query}`, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json()
    const arr = Array.isArray(json) ? json : (json?.results ?? [])
    return {
      count: arr.length,
      sample1: arr[0]?.orderNumber ?? null,
      hasXTotalCount: res.headers.get("x-total-count") || res.headers.get("X-Total-Count"),
      xPagination: res.headers.get("x-pagination") || res.headers.get("X-Pagination"),
      linkHeader: res.headers.get("link") || res.headers.get("Link"),
    }
  }

  async function rawSearchArray(extraParams: Record<string, string>): Promise<number> {
    return (await rawSearch(extraParams).catch(() => ({ count: -1 }))).count
  }

  const skipTake = await rawSearch({ Skip: "0", Take: "100" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const odataTopSkip = await rawSearch({ "$top": "100", "$skip": "0" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const odataTopSkipNoDollar = await rawSearch({ top: "100", skip: "0" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const pageSize100 = await rawSearch({ page: "1", pageSize: "100" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const pageSize200 = await rawSearch({ page: "1", pageSize: "200" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const pageSize500 = await rawSearch({ page: "1", pageSize: "500" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  const cursorToken = await rawSearch({ continuationToken: "0" }).catch(() => ({ count: -1, hasXTotalCount: null, xPagination: null, linkHeader: null, sample1: null }))
  // No date filter at all — just pagination params
  const noFilterPage100 = await cilio.searchJobs({ page: 1, pageSize: 100 }).catch(() => [] as any[]).then((arr: any[]) => arr.length)
  // Test 6: The definitive pagination check — page 1 vs page 2 with same pageSize
  async function rawSearchPage(page: number, pageSize: number): Promise<{ count: number; orderNumbers: number[]; allHeaders: Record<string, string> }> {
    const url = new URL(`${baseUrl}/job/search`)
    url.searchParams.set("OrderModifiedDateStart", start3m.toISOString())
    url.searchParams.set("OrderModifiedDateEnd", end.toISOString())
    url.searchParams.set("PageNumber", String(page))
    url.searchParams.set("PageSize", String(pageSize))
    const query = url.searchParams.toString().replace(/%3A/g, ":")
    const res = await fetch(`${baseUrl}/job/search?${query}`, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json()
    const arr = Array.isArray(json) ? json : (json?.results ?? [])
    const allHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { allHeaders[k] = v })
    return {
      count: arr.length,
      orderNumbers: arr.map((j: any) => j.orderNumber),
      allHeaders,
      ...(json && typeof json === "object" && !Array.isArray(json)
        ? { totalPages: (json as any).totalPages, totalRecords: (json as any).totalRecords }
        : {}),
    }
  }

  // Test with pageSize=25: if pagination works, page1 and page2 should have different jobs
  const page1v25 = await rawSearchPage(1, 25).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const page2v25 = await rawSearchPage(2, 25).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const overlap25 = (page1v25.orderNumbers as number[]).filter(n => (page2v25.orderNumbers as number[]).includes(n)).length

  // Also test pageSize=50
  const page1v50 = await rawSearchPage(1, 50).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const page2v50 = await rawSearchPage(2, 50).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const overlap50 = (page1v50.orderNumbers as number[]).filter(n => (page2v50.orderNumbers as number[]).includes(n)).length

  // Test pageSize=10
  const page1v10 = await rawSearchPage(1, 10).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const page2v10 = await rawSearchPage(2, 10).catch((): any => ({ count: -1, orderNumbers: [], allHeaders: {} }))
  const overlap10 = (page1v10.orderNumbers as number[]).filter(n => (page2v10.orderNumbers as number[]).includes(n)).length

  return NextResponse.json({
    env: {
      keyPrefix: key.slice(0, 6) + "...",
      keyLength: key.length,
      baseUrl,
    },
    noFilter: Array.isArray(noFilter)
      ? { count: noFilter.length, sample1: noFilter[0]?.orderNumber, sample2: noFilter[1]?.orderNumber }
      : noFilter,
    withDates: Array.isArray(withDates)
      ? { count: withDates.length, sample1: withDates[0]?.orderNumber, sample2: withDates[1]?.orderNumber, dateRange: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}` }
      : withDates,
    paginated: Array.isArray(paginated)
      ? { count: paginated.length, sample1: paginated[0]?.orderNumber, sample2: paginated[1]?.orderNumber, dateRange: `${start3m.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}` }
      : paginated,
    wideNoPage: Array.isArray(wideNoPage)
      ? { count: wideNoPage.length, sample1: wideNoPage[0]?.orderNumber, sample2: wideNoPage[1]?.orderNumber, dateRange: `${start3m.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}` }
      : wideNoPage,
    paginationTests: {
      skipTake: skipTake,
      odataTopSkip,
      odataTopSkipNoDollar,
      pageSize100,
      pageSize200,
      pageSize500,
      cursorToken,
      noFilter_pageSize100: noFilterPage100,
    },
    pageVsPage: {
      paginationFormat: page1v25.totalPages ? "NEW (paginated wrapper)" : "OLD (plain array)",
      totalPages: page1v25.totalPages ?? null,
      totalRecords: page1v25.totalRecords ?? null,
      pageSize25: {
        page1: { count: page1v25.count, first3: page1v25.orderNumbers.slice(0, 3) },
        page2: { count: page2v25.count, first3: page2v25.orderNumbers.slice(0, 3) },
        overlap: overlap25,
        working: overlap25 === 0 && page1v25.count > 0 && page2v25.count > 0,
      },
      pageSize50: {
        page1: { count: page1v50.count, first3: page1v50.orderNumbers.slice(0, 3) },
        page2: { count: page2v50.count, first3: page2v50.orderNumbers.slice(0, 3) },
        overlap: overlap50,
        working: overlap50 === 0 && page1v50.count > 0 && page2v50.count > 0,
      },
      pageSize10: {
        page1: { count: page1v10.count, first3: page1v10.orderNumbers.slice(0, 3) },
        page2: { count: page2v10.count, first3: page2v10.orderNumbers.slice(0, 3) },
        overlap: overlap10,
        working: overlap10 === 0 && page1v10.count > 0 && page2v10.count > 0,
      },
      page1Headers: page1v25.allHeaders,
    },
  })
}
