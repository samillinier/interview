import { existsSync } from 'fs'
import type { Browser, Page } from 'playwright-core'

export type PlaywrightSearchHit = {
  url: string
  title: string
  snippet: string
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const EXTRA_ARGS = ['--disable-dev-shm-usage', '--no-sandbox', '--disable-blink-features=AutomationControlled']

function localChromePath(): string | undefined {
  return [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].find((path) => Boolean(path && existsSync(path)))
}

export async function launchMarketingBrowser(): Promise<Browser> {
  const { chromium: playwrightChromium } = await import('playwright-core')
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (serverless) {
    const chromiumMod = await import('@sparticuz/chromium')
    const chromium = (chromiumMod as any).default ?? chromiumMod
    if (typeof chromium.setGraphicsMode === 'function') {
      chromium.setGraphicsMode(false)
    }
    const executablePath = await chromium.executablePath()
    const libDir = String(executablePath || '').replace(/\/[^/]+$/, '')
    if (libDir) {
      process.env.LD_LIBRARY_PATH = [libDir, process.env.LD_LIBRARY_PATH || ''].filter(Boolean).join(':')
    }
    return playwrightChromium.launch({
      args: [...chromium.args, ...EXTRA_ARGS],
      executablePath,
      headless: true,
    })
  }

  const executablePath = localChromePath()
  if (executablePath) {
    return playwrightChromium.launch({
      executablePath,
      headless: true,
      args: EXTRA_ARGS,
    })
  }

  return playwrightChromium.launch({
    channel: 'chrome',
    headless: true,
    args: EXTRA_ARGS,
  })
}

async function newSearchPage(browser: Browser, abortHeavy = false): Promise<Page> {
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    viewport: { width: 1365, height: 900 },
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  if (abortHeavy) {
    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort()
      }
      return route.continue()
    })
  }
  return page
}

function cleanGoogleHref(href: string): string | null {
  try {
    const parsed = new URL(href)
    if (parsed.hostname.includes('google.') && parsed.pathname === '/url') {
      href = parsed.searchParams.get('q') || parsed.searchParams.get('url') || href
    }
    const host = new URL(href).hostname.toLowerCase()
    if (
      host.includes('google.') ||
      host.includes('gstatic.com') ||
      host.includes('youtube.com') ||
      host.includes('schema.org')
    ) {
      return null
    }
    return href.startsWith('http') ? href : null
  } catch {
    return null
  }
}

export async function searchGoogleWithPlaywright(browser: Browser, query: string): Promise<PlaywrightSearchHit[]> {
  const page = await newSearchPage(browser)
  try {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=10&pws=0`, {
      waitUntil: 'domcontentloaded',
      timeout: 18000,
    })

    const consent = page.locator('#L2AGLb, button:has-text("Accept all"), button:has-text("I agree")')
    if (await consent.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await consent.first().click().catch(() => {})
      await page.waitForLoadState('domcontentloaded').catch(() => {})
    }

    await page.waitForSelector('#search a, #rso a, a[jsname="UWckNb"]', { timeout: 8000 }).catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 800))

    const rawItems = (await page.evaluate(`(() => {
      const items = [];
      const seen = new Set();
      const cards = Array.from(document.querySelectorAll('#rso .g, #rso .tF2Cxc, #search .MjjYud, #rso .MjjYud'));
      const fromCite = (cite) => {
        const https = String(cite || '').match(/https?:\\/\\/[^\\s›]+/);
        if (https && https[0]) return https[0].replace(/[.,]+$/, '');
        const host = String(cite || '').split('›')[0].trim().replace(/^https?:\\/\\//, '').split(/\\s+/)[0];
        if (host && /^[a-z0-9.-]+\\.[a-z]{2,}/i.test(host.split('/')[0])) return 'https://' + host;
        return '';
      };
      for (const card of cards) {
        const title = (card.querySelector('h3') && card.querySelector('h3').textContent || '').replace(/\\s+/g, ' ').trim();
        const snippetEl = card.querySelector('.VwiC3b, .MUxGbd, [data-sncf]');
        const snippet = (snippetEl && snippetEl.textContent || '').trim();
        const cite = (card.querySelector('cite') && card.querySelector('cite').textContent) || '';
        const link = card.querySelector('a[href]');
        const href = link && link.href || '';
        const url = fromCite(cite) || href;
        if (!title || !url || seen.has(url)) continue;
        seen.add(url);
        items.push({ url: url, title: title, snippet: snippet });
      }
      if (items.length === 0) {
        const anchors = Array.from(document.querySelectorAll('a[jsname="UWckNb"]'));
        for (const a of anchors) {
          const h3 = a.querySelector('h3');
          const title = ((h3 && h3.textContent) || a.innerText || '').replace(/\\s+/g, ' ').trim();
          const card = a.closest('.g, .tF2Cxc, .MjjYud');
          const cite = (card && card.querySelector('cite') && card.querySelector('cite').textContent) || '';
          const url = fromCite(cite) || a.href;
          if (!title || !url || seen.has(url)) continue;
          seen.add(url);
          items.push({ url: url, title: title, snippet: '' });
        }
      }
      return items;
    })()`)) as PlaywrightSearchHit[]
    const hits: PlaywrightSearchHit[] = []
    const seenHosts = new Set<string>()
    for (const item of rawItems) {
      const url = cleanGoogleHref(item.url)
      if (!url) continue
      let host = ''
      try {
        host = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        continue
      }
      if (seenHosts.has(host)) continue
      seenHosts.add(host)
      hits.push({ url, title: item.title, snippet: item.snippet })
      if (hits.length >= 8) break
    }
    return hits
  } catch {
    return []
  } finally {
    await page.close().catch(() => {})
  }
}

export async function searchDuckDuckGoWithPlaywright(browser: Browser, query: string): Promise<PlaywrightSearchHit[]> {
  const page = await newSearchPage(browser)
  try {
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    await page.waitForSelector('a.result__a', { timeout: 8000 }).catch(() => {})
    const rows = (await page.evaluate(`(() => {
      return Array.from(document.querySelectorAll('a.result__a')).map((a) => {
        const result = a.closest('.result');
        const snippetEl = result && result.querySelector('.result__snippet');
        return {
          url: a.href,
          title: (a.textContent || '').trim(),
          snippet: (snippetEl && snippetEl.textContent || '').trim(),
        };
      });
    })()`)) as PlaywrightSearchHit[]
    return rows
      .map((row) => {
        try {
          const parsed = new URL(row.url)
          const uddg = parsed.searchParams.get('uddg')
          const url = uddg ? decodeURIComponent(uddg) : parsed.hostname.includes('duckduckgo.com') ? '' : row.url
          return url ? { ...row, url } : null
        } catch {
          return row.url.startsWith('http') ? row : null
        }
      })
      .filter((row): row is PlaywrightSearchHit => Boolean(row))
  } catch {
    return []
  } finally {
    await page.close().catch(() => {})
  }
}

export async function renderPageHtml(
  browser: Browser,
  url: string,
  timeoutMs = 12000,
): Promise<{ html: string; finalUrl: string } | null> {
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 720 },
  })
  try {
    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort()
      }
      return route.continue()
    })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => {})
    const html = await page.content()
    if (!html) return null
    return { html, finalUrl: page.url() || url }
  } catch {
    return null
  } finally {
    await page.close().catch(() => {})
  }
}
