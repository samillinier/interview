function extractExpiryFromText(rawText: string): Date | null {
  const text = String(rawText || '').toLowerCase()
  if (!text.trim()) return null

  const parseMonthNameDate = (monthRaw: string, dayRaw: string, yearRaw: string): Date | null => {
    const monthMap: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    }
    const month = monthMap[String(monthRaw || '').toLowerCase()]
    if (month === undefined) return null
    const dd = Number(dayRaw)
    const yyyy = Number(yearRaw)
    const d = new Date(Date.UTC(yyyy, month, dd))
    return Number.isNaN(d.getTime()) ? null : d
  }

  // BTR template rule: Duval/local business tax receipts usually print
  // "VALID UNTIL September 30, 2023" in the lower-center of the page.
  // OCR may insert line breaks or extra punctuation, so normalize only for this keyword search.
  const normalizedForValidUntil = String(rawText || '')
    .replace(/\s+/g, ' ')
    .replace(/[|()[\]{}]/g, ' ')
    .trim()

  const validUntilMonthName =
    /valid\s+until\W{0,20}(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\W+(\d{1,2})\W+(\d{4})/i.exec(normalizedForValidUntil)
  if (validUntilMonthName) {
    const d = parseMonthNameDate(validUntilMonthName[1], validUntilMonthName[2], validUntilMonthName[3])
    if (d) return d
  }

  const validUntilNumeric = /valid\s+until\W{0,20}(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i.exec(normalizedForValidUntil)
  if (validUntilNumeric) {
    const mm = Number(validUntilNumeric[1])
    const dd = Number(validUntilNumeric[2])
    const yyyy = Number(validUntilNumeric[3])
    const d = new Date(Date.UTC(yyyy, mm - 1, dd))
    if (!Number.isNaN(d.getTime())) return d
  }

  const expiresMonthName =
    /expires?\W{0,20}(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\W+(\d{1,2})\W+(\d{4})/i.exec(normalizedForValidUntil)
  if (expiresMonthName) {
    const d = parseMonthNameDate(expiresMonthName[1], expiresMonthName[2], expiresMonthName[3])
    if (d) return d
  }

  const expiresNumeric = /expires?\W{0,20}(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i.exec(normalizedForValidUntil)
  if (expiresNumeric) {
    const mm = Number(expiresNumeric[1])
    const dd = Number(expiresNumeric[2])
    const yyyy = Number(expiresNumeric[3])
    const d = new Date(Date.UTC(yyyy, mm - 1, dd))
    if (!Number.isNaN(d.getTime())) return d
  }

  const candidates: Array<{ date: Date; idx: number }> = []

  // ISO dates returned by AI/structured parsers, e.g. "2026-09-30".
  const isoDateRegex = /\b(20\d{2})-(\d{2})-(\d{2})\b/g
  {
    let m: RegExpExecArray | null
    while ((m = isoDateRegex.exec(text)) !== null) {
      const yyyy = Number(m[1])
      const mm = Number(m[2])
      const dd = Number(m[3])
      const d = new Date(Date.UTC(yyyy, mm - 1, dd))
      if (!Number.isNaN(d.getTime())) candidates.push({ date: d, idx: m.index ?? 0 })
    }
  }

  // 1) Numeric dates: MM/DD/YYYY or M/D/YYYY
  const numericDateRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g
  {
    let m: RegExpExecArray | null
    while ((m = numericDateRegex.exec(text)) !== null) {
      const mm = Number(m[1])
      const dd = Number(m[2])
      const yyyy = Number(m[3])
      const d = new Date(Date.UTC(yyyy, mm - 1, dd))
      if (!Number.isNaN(d.getTime())) candidates.push({ date: d, idx: m.index ?? 0 })
    }
  }

  // 2) Month-name dates: "September 30, 2023"
  const monthNameRegex =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s*,\s*(\d{4})\b/g
  {
    let m: RegExpExecArray | null
    while ((m = monthNameRegex.exec(text)) !== null) {
      const d = parseMonthNameDate(m[1], m[2], m[3])
      if (d) candidates.push({ date: d, idx: m.index ?? 0 })
    }
  }

  if (candidates.length === 0) return null

  // Prefer a date near "valid until" / "valid through" / "expiration" keywords.
  const keywords = ['valid until', 'valid thru', 'valid through', 'through', 'expir', 'expires', 'expiration']
  let best: { date: Date; score: number } | null = null
  for (const c of candidates) {
    const windowStart = Math.max(0, c.idx - 120)
    const windowEnd = Math.min(text.length, c.idx + 120)
    const window = text.slice(windowStart, windowEnd)
    const hit = keywords.some((k) => window.includes(k))
    const score = (hit ? 1000 : 0) + Math.floor(c.date.getTime() / 86400000)
    if (!best || score > best.score) best = { date: c.date, score }
  }

  // Fallback: latest date in document
  return best?.date ?? candidates.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
}

function inferBtrExpiryFromFileName(name: string): Date | null {
  const lowerName = String(name || '').toLowerCase()
  if (!/\bbtr\b|business[^a-z0-9]+tax[^a-z0-9]+receipt/i.test(lowerName)) return null

  const years: number[] = []
  const yearRegex = /\b(20\d{2})\b/g
  let match: RegExpExecArray | null
  while ((match = yearRegex.exec(lowerName)) !== null) {
    const year = Number(match[1])
    if (year >= 2020 && year <= 2100) years.push(year)
  }

  if (years.length === 0) return null
  const expiryYear = Math.max(...years)
  return new Date(Date.UTC(expiryYear, 8, 30))
}

async function ocrTextWithAwsTextract(buf: Buffer): Promise<string | null> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
  if (!accessKeyId || !secretAccessKey || !region) return null

  // Textract synchronous APIs have payload limits (keep a bit under 5MB).
  if (!buf || buf.length <= 0 || buf.length > 4.5 * 1024 * 1024) return null

  try {
    const mod: any = await import('@aws-sdk/client-textract')
    const TextractClient = mod?.TextractClient
    const DetectDocumentTextCommand = mod?.DetectDocumentTextCommand
    if (!TextractClient || !DetectDocumentTextCommand) return null

    const client = new TextractClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })

    const resp = await client.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: buf },
      })
    )

    const blocks: any[] = Array.isArray(resp?.Blocks) ? resp.Blocks : []
    const lines = blocks
      .filter((b) => b && b.BlockType === 'LINE' && typeof b.Text === 'string' && b.Text.trim() !== '')
      .map((b) => String(b.Text))
    const joined = lines.join('\n')
    return joined || null
  } catch (e) {
    console.error('BTR Textract OCR failed:', e)
    return null
  }
}

async function ocrTextWithLlamaParse(args: {
  buf: Buffer
  filename: string
  contentType: string
}): Promise<string | null> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY
  if (!apiKey) return null
  if (!args.buf || args.buf.length <= 0) return null

  try {
    // 1) Upload file
    const form = new FormData()
    form.set('file', new Blob([args.buf], { type: args.contentType }), args.filename)

    const uploadResp = await fetch('https://api.cloud.llamaindex.ai/api/v1/files/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: form,
    })
    if (!uploadResp.ok) return null
    const uploadJson: any = await uploadResp.json().catch(() => null)
    const fileId = uploadJson?.id
    if (!fileId) return null

    // 2) Create parse job
    const parseResp = await fetch('https://api.cloud.llamaindex.ai/api/v2/parse', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: fileId,
        tier: 'agentic',
        version: 'latest',
      }),
    })
    if (!parseResp.ok) return null
    const parseJson: any = await parseResp.json().catch(() => null)
    const jobId = parseJson?.job?.id || parseJson?.id
    if (!jobId) return null

    // 3) Poll until completed (keep it short for serverless)
    const deadline = Date.now() + 12_000
    let last: any = null
    while (Date.now() < deadline) {
      const res = await fetch(`https://api.cloud.llamaindex.ai/api/v2/parse/${jobId}?expand=text_full,job`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      })
      if (!res.ok) break
      last = await res.json().catch(() => null)
      const status = String(last?.job?.status || '').toUpperCase()
      if (status === 'COMPLETED') break
      if (status === 'FAILED') return null
      await new Promise((r) => setTimeout(r, 1200))
    }

    const textFull = last?.text_full
    if (typeof textFull === 'string' && textFull.trim()) return textFull
    return null
  } catch (e) {
    console.error('BTR LlamaParse OCR failed:', e)
    return null
  }
}

async function extractBtrExpiryWithOpenAiVision(args: {
  url: string
  name?: string | null
}): Promise<Date | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') return null

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: 'system',
            content:
              'Extract the expiration date from a Business Tax Receipt (BTR). Prefer text near VALID UNTIL, EXPIRES, EXPIRATION, or the tax receipt period end date. Return only JSON like {"expiryDate":"YYYY-MM-DD"} or {"expiryDate":null}.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Find the BTR expiration date in this document image. Filename: ${args.name || 'document'}`,
              },
              {
                type: 'image_url',
                image_url: { url: args.url },
              },
            ],
          },
        ],
      }),
    })

    if (!resp.ok) {
      console.error('BTR OpenAI vision failed:', resp.status, await resp.text().catch(() => ''))
      return null
    }

    const json: any = await resp.json().catch(() => null)
    const content = String(json?.choices?.[0]?.message?.content || '').trim()
    if (!content) return null

    const parsed = content.match(/\{[\s\S]*\}/)
    if (parsed) {
      const obj = JSON.parse(parsed[0])
      const expiryDate = obj?.expiryDate
      if (typeof expiryDate === 'string' && expiryDate.trim()) {
        const d = new Date(`${expiryDate.trim()}T00:00:00.000Z`)
        if (!Number.isNaN(d.getTime())) return d
      }
    }

    return extractExpiryFromText(content)
  } catch (e) {
    console.error('BTR OpenAI vision extraction failed:', e)
    return null
  }
}

async function ocrTextWithTesseract(args: {
  buf: Buffer
  lang?: string
  rectangle?: { left: number; top: number; width: number; height: number }
}): Promise<string | null> {
  if (!args.buf || args.buf.length <= 0) return null
  try {
    const mod: any = await import('tesseract.js')
    const recognize: any = mod?.recognize || mod?.default?.recognize
    if (typeof recognize !== 'function') return null
    const path = require('path')
    const nodeRequire = eval('require') as NodeRequire
    const workerPath = nodeRequire.resolve('tesseract.js/src/worker-script/node/index.js')
    const corePath = nodeRequire.resolve('tesseract.js-core/tesseract-core-simd.wasm.js')
    const langPath = path.dirname(nodeRequire.resolve('@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'))
    const out = await recognize(args.buf, args.lang || 'eng', {
      workerPath,
      corePath,
      langPath,
      gzip: true,
      cacheMethod: 'none',
      ...(args.rectangle ? { rectangle: args.rectangle } : {}),
    })
    const text = String(out?.data?.text || '').trim()
    return text || null
  } catch (e) {
    console.error('BTR Tesseract OCR failed:', e)
    return null
  }
}

async function ocrBtrImageByTemplateRegion(buf: Buffer): Promise<string | null> {
  try {
    const mod: any = await import('image-size')
    const imageSize: any = mod?.imageSize || mod?.default || mod
    if (typeof imageSize !== 'function') return null

    const size = imageSize(buf)
    const width = Number(size?.width || 0)
    const height = Number(size?.height || 0)
    if (!width || !height) return null

    // BTR template target: "VALID UNTIL ..." sits lower-center, above the large year text.
    const rectangle = {
      left: Math.max(0, Math.floor(width * 0.12)),
      top: Math.max(0, Math.floor(height * 0.50)),
      width: Math.max(1, Math.floor(width * 0.76)),
      height: Math.max(1, Math.floor(height * 0.20)),
    }

    return await ocrTextWithTesseract({ buf, lang: 'eng', rectangle })
  } catch (e) {
    console.error('BTR template-region OCR failed:', e)
    return null
  }
}

export async function extractBtrExpiryFromUploadedFile(args: {
  url: string
  name?: string | null
}): Promise<Date | null> {
  const url = String(args.url || '').trim()
  const name = String(args.name || '').trim()
  const ext = (name.split('.').pop() || '').toLowerCase()

  // Supported inputs: PDFs and common image types.
  const supported = new Set(['pdf', 'png', 'jpg', 'jpeg'])
  if (!supported.has(ext)) return null

  try {
    const fromFileName = inferBtrExpiryFromFileName(name)
    if (fromFileName) return fromFileName

    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())

    // First attempt: parse selectable text from PDF.
    if (ext === 'pdf') {
      try {
        const mod: any = await import('pdf-parse')
        const pdfParseFn: any = mod?.default || mod
        if (typeof pdfParseFn === 'function') {
          const parsed = await pdfParseFn(buf).catch(() => null)
          const rawText = String(parsed?.text || '')
          const fromPdfText = extractExpiryFromText(rawText)
          if (fromPdfText) return fromPdfText
        }
      } catch (e) {
        console.error('BTR pdf-parse failed:', e)
      }

      // NOTE: Tesseract OCR requires rasterizing PDFs to images first.
      // In serverless environments (Vercel) that’s not reliable without native deps,
      // so for scanned PDFs, ask for JPG/PNG upload (or use a cloud OCR fallback).
    }

    // OCR for images: use Tesseract (open-source).
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      // Production-safe fallback: serverless Tesseract can be slow/hang on Vercel.
      const aiVisionDate = await extractBtrExpiryWithOpenAiVision({ url, name })
      if (aiVisionDate) return aiVisionDate

      const templateRegionText = await ocrBtrImageByTemplateRegion(buf)
      if (templateRegionText) {
        const d = extractExpiryFromText(templateRegionText)
        if (d) return d
      }

      const ocrText = await ocrTextWithTesseract({ buf, lang: 'eng' })
      if (ocrText) {
        const d = extractExpiryFromText(ocrText)
        if (d) return d
      }
    }

    // Optional cloud OCR fallback (if configured).
    const contentType =
      ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg'
    const llamaText = await ocrTextWithLlamaParse({
      buf,
      filename: name || `btr.${ext}`,
      contentType,
    })
    if (llamaText) {
      const d = extractExpiryFromText(llamaText)
      if (d) return d
    }

    // Optional cloud OCR fallback (if configured).
    const ocrText = await ocrTextWithAwsTextract(buf)
    if (!ocrText) return null
    return extractExpiryFromText(ocrText)
  } catch (e) {
    console.error('BTR expiry extraction failed:', e)
    return null
  }
}

