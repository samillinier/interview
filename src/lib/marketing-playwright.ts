import { existsSync } from 'fs'
import type { Browser } from 'playwright-core'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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
      args: chromium.args,
      executablePath,
      headless: true,
    })
  }

  const executablePath = localChromePath()
  if (executablePath) {
    return playwrightChromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    })
  }

  return playwrightChromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  })
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
