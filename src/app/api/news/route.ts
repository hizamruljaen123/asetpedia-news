import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { decode as decodeHtml } from 'he'

interface RSSFeed {
  name: string
  url: string
  category: string
}

interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  category: string
  img?: string
}

const HTML_ENTITY_PATTERN = /&(?:[a-zA-Z]+|#\d+|#x[a-fA-F0-9]+);/

const decodeHtmlEntities = (value: string) => {
  if (!value) return value

  let decoded = decodeHtml(value)

  // Handle double-encoded entities like &amp;#8217;
  while (HTML_ENTITY_PATTERN.test(decoded)) {
    const nextDecoded = decodeHtml(decoded)
    if (nextDecoded === decoded) break
    decoded = nextDecoded
  }

  return decoded
}

const ONE_HOUR_MS = 60 * 60 * 1000

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const resolveAllowedOrigin = (originHeader?: string | null) => {
  if (ALLOWED_ORIGINS.length === 0) {
    return originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? '*'
  }

  if (ALLOWED_ORIGINS.includes('*')) {
    return '*'
  }

  if (originHeader && ALLOWED_ORIGINS.includes(originHeader)) {
    return originHeader
  }

  if (!originHeader && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  return ALLOWED_ORIGINS[0]
}

const getCorsHeaders = (request: NextRequest, additionalHeaders: Record<string, string> = {}) => {
  const originHeader = request.headers.get('origin')
  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(originHeader),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...additionalHeaders,
  }
}

const respondWithJson = (
  request: NextRequest,
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
) => {
  const headers = getCorsHeaders(request, init?.headers ?? {})
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers,
  })
}

const DEFAULT_RESPONSE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

type CacheFileInfo = {
  file: string
  path: string
  timestamp: number
}

type FeedFormat = 'rss' | 'atom' | 'unknown'

const detectFeedFormat = (xml: string): FeedFormat => {
  if (/<!DOCTYPE\s+html/i.test(xml)) {
    return 'unknown'
  }
  if (/<rss[\s>]/i.test(xml) || /<channel[\s>]/i.test(xml)) {
    return 'rss'
  }
  if (/<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml)) {
    return 'atom'
  }
  if (/<item[\s>]/i.test(xml)) {
    return 'rss'
  }
  return 'unknown'
}

const stripCData = (value: string) => {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<!\[CDATA\(([\s\S]*?)\)\]\]>/g, '$1')
    .replace(/]]>/g, '')
}

const sanitizeText = (value?: string) => {
  if (!value) return undefined
  const cleaned = stripCData(value).replace(/<[^>]*>/g, '').trim()
  const decoded = cleaned ? decodeHtmlEntities(cleaned) : undefined
  return decoded && decoded.length > 0 ? decoded : undefined
}

const getCacheTimestamp = (file: string): number | null => {
  const match = file.match(/(?:news|category_\w+)_(\d+)\.json/)
  return match ? Number(match[1]) : null
}

const removeCacheFiles = async (files: CacheFileInfo[], excludePath?: string) => {
  await Promise.all(
    files
      .filter(info => info.path !== excludePath)
      .map(async info => {
        try {
          await fs.unlink(info.path)
          console.log(`Deleted old cache ${info.file}`)
        } catch (error) {
          console.error(`Error deleting cache file ${info.file}:`, error)
        }
      })
  )
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchRSSFeed(feed: RSSFeed, timeout = 10000): Promise<NewsItem[]> {
  try {
    console.log(`Loading RSS: ${feed.name} - ${feed.url}`)
    const response = await fetchWithTimeout(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, timeout)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    
    const items: NewsItem[] = []
    const format = detectFeedFormat(text)

    if (format === 'rss' || format === 'unknown') {
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g)
      if (itemMatches) {
        itemMatches.forEach(itemMatch => {
          const titleMatch = itemMatch.match(/<title>([\s\S]*?)<\/title>/)
          const linkMatch = itemMatch.match(/<link>([\s\S]*?)<\/link>/) || itemMatch.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)
          const descMatch = itemMatch.match(/<description>([\s\S]*?)<\/description>/)
          const pubDateMatch = itemMatch.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
          const imgMatch = itemMatch.match(/<img>([\s\S]*?)<\/img>/)

          if (titleMatch && linkMatch) {
            const title = sanitizeText(titleMatch[1]) || 'Tanpa judul'
            const link = stripCData(linkMatch[1]).trim()
            const description = sanitizeText(descMatch ? descMatch[1] : undefined) ?? 'Tidak ada deskripsi'
            const pubDate = pubDateMatch ? stripCData(pubDateMatch[1]).trim() : new Date().toISOString()

            items.push({
              title,
              link,
              description,
              pubDate,
              source: feed.name,
              category: feed.category,
              img: imgMatch ? stripCData(imgMatch[1]).trim() : undefined
            })
          }
        })
      }
    } else if (format === 'atom') {
      const entryMatches = text.match(/<entry[\s\S]*?<\/entry>/g)
      if (entryMatches) {
        entryMatches.forEach(entry => {
          const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)
          const linkMatch = entry.match(/<link[^>]*href="([^"]+)"[^>]*>/) || entry.match(/<id>([\s\S]*?)<\/id>/)
          const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)
          const updatedMatch = entry.match(/<updated>([\s\S]*?)<\/updated>/) || entry.match(/<published>([\s\S]*?)<\/published>/)

          if (titleMatch && linkMatch) {
            const title = sanitizeText(titleMatch[1]) || 'Tanpa judul'
            const link = stripCData(linkMatch[1]).trim()
            const description = sanitizeText(summaryMatch ? summaryMatch[1] : undefined) ?? 'Tidak ada deskripsi'
            const pubDate = updatedMatch ? stripCData(updatedMatch[1]).trim() : new Date().toISOString()

            items.push({
              title,
              link,
              description,
              pubDate,
              source: feed.name,
              category: feed.category,
            })
          }
        })
      }
    }

    console.log(`Loaded ${items.length} news from ${feed.name}`)
    return items
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`Timeout (${timeout}ms) fetching ${feed.name}`)
      } else {
        console.error(`Error fetching ${feed.name}:`, error.message)
      }
    } else {
      console.error(`Unknown error fetching ${feed.name}:`, error)
    }
    return []
  }
}

const saveNewsByCategory = async (newsItems: NewsItem[], timestamp: number) => {
  const cacheDir = path.join(process.cwd(), 'cache')
  await fs.mkdir(cacheDir, { recursive: true })

  try {
    const entries = await fs.readdir(cacheDir)
    await Promise.all(
      entries.map(entry => fs.rm(path.join(cacheDir, entry), { recursive: true, force: true }))
    )
  } catch (error) {
    console.error('Error clearing cache directory:', error)
  }

  // Group news by category
  const newsByCategory: { [key: string]: NewsItem[] } = {}
  
  // Add to ALL category
  newsByCategory['ALL'] = [...newsItems]
  
  // Group by individual categories
  newsItems.forEach(item => {
    const category = item.category?.toUpperCase() || 'UNCATEGORIZED'
    if (!newsByCategory[category]) {
      newsByCategory[category] = []
    }
    newsByCategory[category].push(item)
  })

  // Save each category to separate files
  await Promise.all(
    Object.entries(newsByCategory).map(async ([category, items]) => {
      const categoryCacheDir = path.join(cacheDir, category.toLowerCase())
      await fs.mkdir(categoryCacheDir, { recursive: true })
      
      const filename = `category_${category.toLowerCase()}_${timestamp}.json`
      const filepath = path.join(categoryCacheDir, filename)
      
      try {
        await fs.writeFile(filepath, JSON.stringify(items))
        console.log(`Saved ${items.length} items to ${filepath}`)
      } catch (error) {
        console.error(`Error saving ${category} cache:`, error)
      }
    })
  )
}

const getLatestCategoryCache = async (category: string) => {
  const cacheDir = path.join(process.cwd(), 'cache', category.toLowerCase())
  
  try {
    await fs.access(cacheDir)
    const files = (await fs.readdir(cacheDir))
      .filter(f => f.startsWith(`category_${category.toLowerCase()}_`) && f.endsWith('.json'))
      .sort((a, b) => (getCacheTimestamp(b) || 0) - (getCacheTimestamp(a) || 0))
    
    if (files.length === 0) return null
    
    const latestFile = files[0]
    const filePath = path.join(cacheDir, latestFile)
    const data = await fs.readFile(filePath, 'utf-8')
    
    return {
      data: JSON.parse(data) as NewsItem[],
      timestamp: getCacheTimestamp(latestFile) || Date.now(),
      path: filePath
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryParam = (searchParams.get('category') || 'ALL').toUpperCase()
    const update = searchParams.get('update') === 'true'
    
    // Check cache first if not forcing update
    if (!update) {
      const cache = await getLatestCategoryCache(categoryParam === 'ALL' ? 'all' : categoryParam)
      const now = Date.now()
      
      if (cache && (now - cache.timestamp) <= ONE_HOUR_MS) {
        console.log(`Using cached data for ${categoryParam} (${cache.data.length} items)`)
        return respondWithJson(request, cache.data, {
          headers: DEFAULT_RESPONSE_HEADERS,
        })
      }
    }

    // If we reach here, we need to fetch fresh data
    console.log('Cache miss or update forced, fetching fresh data...')
    
    // Fetch RSS feeds from JSON file
    let RSS_FEEDS: RSSFeed[] = []
    try {
      const feedsResponse = await fetch('http://localhost:3001/rss_feeds.json')
      if (!feedsResponse.ok) {
        throw new Error(`Failed to fetch RSS feeds: ${feedsResponse.status}`)
      }
      RSS_FEEDS = await feedsResponse.json()
      console.log(`Fetched ${RSS_FEEDS.length} RSS feeds from JSON`)
    } catch (error) {
      console.error('Error fetching RSS feeds JSON:', error)
      console.log('Using empty RSS feeds list')
      // Return empty news instead of error
      return respondWithJson(request, [], {
        headers: DEFAULT_RESPONSE_HEADERS,
      })
    }
    
    // Process feeds in batches with delay
    const processFeeds = async (feeds: RSSFeed[]) => {
      let allNews: NewsItem[] = []
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      const BATCH_SIZE = 5
      const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds
      
      for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
        const batch = feeds.slice(i, i + BATCH_SIZE)
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(feeds.length / BATCH_SIZE)} (${batch.length} feeds)`)
        
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async feed => {
            try {
              const result = await fetchRSSFeed(feed, 15000) // 15 second timeout per feed
              console.log(`✅ Successfully fetched ${result.length} items from ${feed.name}`)
              return result
            } catch (error) {
              console.error(`❌ Error in feed ${feed.name}:`, error)
              return []
            }
          })
        )
        
        allNews = [...allNews, ...batchResults.flat()]
        
        // Add delay between batches if not the last batch
        if (i + BATCH_SIZE < feeds.length) {
          console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
          await delay(DELAY_BETWEEN_BATCHES)
        }
      }
      
      return allNews
    }
    
    // Fetch RSS feeds from JSON file
    try {
      const feedsResponse = await fetch('http://localhost:3001/rss_feeds.json')
      if (!feedsResponse.ok) {
        throw new Error(`Failed to fetch RSS feeds: ${feedsResponse.status}`)
      }
      RSS_FEEDS = await feedsResponse.json()
      console.log(`Fetched ${RSS_FEEDS.length} RSS feeds from JSON`)
    } catch (error) {
      console.error('Error fetching RSS feeds JSON:', error)
      console.log('Using empty RSS feeds list')
      return respondWithJson(request, [], {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      })
    }

    // Create cache directory if it doesn't exist
    const cacheDir = path.join(process.cwd(), 'cache')
    await fs.mkdir(cacheDir, { recursive: true })
    
    // Check if we have a recent cache for all categories
    const allCategories = [...new Set(RSS_FEEDS.map(feed => feed.category.toUpperCase()))]
    const timestamp = Date.now()
    let allNews: NewsItem[] = []
    let useCache = !update

    if (useCache) {
      const cacheChecks = await Promise.all(
        allCategories.map(async category => {
          const cache = await getLatestCategoryCache(category)
          return cache && (timestamp - cache.timestamp) <= ONE_HOUR_MS
        })
      )
      useCache = cacheChecks.every(Boolean)
    }

    if (useCache) {
      console.log('Using cached data for all categories')
      const cache = await getLatestCategoryCache(categoryParam === 'ALL' ? 'all' : categoryParam)
      if (cache) {
        return respondWithJson(request, cache.data, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        })
      }
    }

    // If we get here, we need to fetch fresh data
    console.log('Fetching all news feeds...')
    try {
      allNews = await processFeeds(RSS_FEEDS)

      if (allNews.length === 0) {
        console.log('No news items were fetched. Returning empty array.')
        return respondWithJson(request, [], {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        })
      }

      // Sort by publication date (newest first)
      allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

      // Save to cache by category
      console.log('Saving news to cache by category...')
      await saveNewsByCategory(allNews, timestamp)

      // Filter by requested category if needed
      let responseData = allNews
      if (categoryParam !== 'ALL') {
        responseData = allNews.filter(item => item.category?.toUpperCase() === categoryParam)
      }

      console.log(`Successfully fetched and cached ${responseData.length} news items`)
      return respondWithJson(request, responseData, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      })
    } catch (error) {
      console.error('Error fetching news:', error)
      return respondWithJson(request, [], {
        status: 500,
      })
    }