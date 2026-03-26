import FirecrawlApp from '@mendable/firecrawl-js'

function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed.includes('.') || trimmed.length < 4) return null
  if (/\s/.test(trimmed)) return null
  if (!/^[a-z0-9]/.test(trimmed)) return null
  if (!/\.[a-z]{2,}/.test(trimmed)) return null

  let url = trimmed
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  try {
    const parsed = new URL(url)
    const parts = parsed.hostname.split('.')
    if (parts.length < 2) return null
    if (parts[parts.length - 1].length < 2) return null
    return parsed.toString()
  } catch { return null }
}

function cleanMarkdown(raw: string): string {
  return raw
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      // Remove image-only lines
      if (/^!\[/.test(trimmed) && !trimmed.includes(']( ')) return false
      // Remove nav links with just images
      if (/^\[!\[/.test(trimmed)) return false
      // Remove empty or very short lines
      if (trimmed.length < 10) return false
      // Remove lines that are just URLs
      if (/^https?:\/\//.test(trimmed)) return false
      // Remove skip-to-content type links
      if (trimmed.includes('Skip to content')) return false
      // Remove cookie/privacy boilerplate
      if (/cookie|privacy policy|©\d{4}/i.test(trimmed) && trimmed.length < 80) return false
      // Remove page load links
      if (trimmed.includes('Page load link')) return false
      return true
    })
    // Deduplicate consecutive identical lines (headers repeated for mobile/desktop)
    .filter((line, i, arr) => i === 0 || line.trim() !== arr[i - 1].trim())
    .join('\n')
    .trim()
}

export async function isWebsiteReachable(url: string): Promise<boolean> {
  const cleanUrl = normaliseUrl(url)
  if (!cleanUrl) return false
  try {
    const res = await fetch(cleanUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'follow' })
    return res.ok || res.status === 301 || res.status === 302 || res.status === 403
  } catch { return false }
}

async function scrapeSinglePage(app: FirecrawlApp, url: string): Promise<string> {
  try {
    const result = await app.scrape(url, { formats: ['markdown'] })
    return (result as Record<string, string>)?.markdown ?? ''
  } catch { return '' }
}

export async function scrapeWebsite(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return null

  const cleanUrl = normaliseUrl(url)
  if (!cleanUrl) return null

  const reachable = await isWebsiteReachable(url)
  if (!reachable) {
    console.warn('[Scraper] Not reachable, skipping:', url)
    return null
  }

  try {
    const app = new FirecrawlApp({ apiKey })

    // Scrape homepage
    console.log('[Scraper] Scraping homepage:', cleanUrl)
    const homepage = await scrapeSinglePage(app, cleanUrl)

    // Try to find and scrape an about page for more detail
    const parsed = new URL(cleanUrl)
    const aboutUrls = [
      `${parsed.origin}/about`,
      `${parsed.origin}/about-us`,
      `${parsed.origin}/services`,
      `${parsed.origin}/what-we-do`,
    ]

    let aboutContent = ''
    for (const aboutUrl of aboutUrls) {
      try {
        const res = await fetch(aboutUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000), redirect: 'follow' })
        if (res.ok) {
          console.log('[Scraper] Found about page:', aboutUrl)
          aboutContent = await scrapeSinglePage(app, aboutUrl)
          break
        }
      } catch { continue }
    }

    // Combine and clean
    const combined = [homepage, aboutContent].filter(Boolean).join('\n\n')
    const cleaned = cleanMarkdown(combined)

    console.log('[Scraper] Raw:', combined.length, 'chars -> Cleaned:', cleaned.length, 'chars')

    if (cleaned.length < 50) return null

    // Truncate to 4000 chars for the prompt (increased from 3000)
    if (cleaned.length > 4000) {
      return cleaned.slice(0, 4000) + '\n\n[Content truncated]'
    }

    return cleaned
  } catch (err) {
    console.error('[Scraper] Failed:', err)
    return null
  }
}
