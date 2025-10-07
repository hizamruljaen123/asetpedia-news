"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Terminal, RefreshCw, Activity, Database, Globe, ArrowRight, Search } from 'lucide-react'
import { decode as decodeHtml } from 'he'
import './terminal.css'

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  category: string
  description?: string
  img?: string
}

interface RSSFeed {
  name: string
  url: string
  category: string
}

const getRssFeeds = async () => {
  const response = await fetch('/rss_feeds.json');
  const data = await response.json();
  return data;
};

const CATEGORIES = ['ALL', 'Business', 'Economy', 'Technology', 'Politics', 'World', 'News', 'Sports', 'Multimedia', 'General', 'Health', 'Science', 'Entertainment', 'Investasi', 'Crypto']

const CATEGORY_COLORS: { [key: string]: string } = {
  'ALL': 'text-slate-600',
  'BUSINESS': 'text-yellow-600',
  'ECONOMY': 'text-emerald-600',
  'TECHNOLOGY': 'text-blue-600',
  'POLITICS': 'text-rose-600',
  'WORLD': 'text-purple-600',
  'NEWS': 'text-cyan-600',
  'SPORTS': 'text-orange-600',
  'MULTIMEDIA': 'text-indigo-600',
  'GENERAL': 'text-gray-600',
  'HEALTH': 'text-red-600',
  'SCIENCE': 'text-teal-600',
  'ENTERTAINMENT': 'text-pink-600',
  'INVESTASI': 'text-amber-600',
  'CRYPTO': 'text-violet-600'
}

const CATEGORY_BG_COLORS: { [key: string]: string } = {
  'ALL': 'bg-slate-50 border-slate-200',
  'BUSINESS': 'bg-yellow-50 border-yellow-200',
  'ECONOMY': 'bg-emerald-50 border-emerald-200',
  'TECHNOLOGY': 'bg-blue-50 border-blue-200',
  'POLITICS': 'bg-rose-50 border-rose-200',
  'WORLD': 'bg-purple-50 border-purple-200',
  'NEWS': 'bg-cyan-50 border-cyan-200',
  'SPORTS': 'bg-orange-50 border-orange-200',
  'MULTIMEDIA': 'bg-indigo-50 border-indigo-200',
  'GENERAL': 'bg-gray-50 border-gray-200',
  'HEALTH': 'bg-red-50 border-red-200',
  'SCIENCE': 'bg-teal-50 border-teal-200',
  'ENTERTAINMENT': 'bg-pink-50 border-pink-200',
  'INVESTASI': 'bg-amber-50 border-amber-200',
  'CRYPTO': 'bg-violet-50 border-violet-200'
}

const CATEGORY_ACCENT_COLORS: { [key: string]: string } = {
  'ALL': '#cbd5f5',
  'BUSINESS': '#facc15',
  'ECONOMY': '#22c55e',
  'TECHNOLOGY': '#3b82f6',
  'POLITICS': '#ef4444',
  'WORLD': '#a855f7',
  'NEWS': '#06b6d4',
  'SPORTS': '#fb923c',
  'MULTIMEDIA': '#6366f1',
  'GENERAL': '#6b7280',
  'HEALTH': '#ef4444',
  'SCIENCE': '#14b8a6',
  'ENTERTAINMENT': '#ec4899',
  'INVESTASI': '#f59e0b',
  'CRYPTO': '#8b5cf6'
}

const decodeHtmlEntities = (value?: string | null) => {
  if (!value) return ''
  return decodeHtml(value)
}

const formatDescription = (description?: string | null) => {
  if (!description) return undefined

  const stripped = description
    .replace(/<\/?p[^>]*>/g, ' ')
    .replace(/<img[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, ' ')

  const decoded = decodeHtmlEntities(stripped)
  const normalized = decoded.replace(/\s+/g, ' ').trim()

  if (!normalized) return undefined

  return normalized.length > 200 ? `${normalized.slice(0, 200)}...` : normalized
}

const groupNewsByDate = (items: NewsItem[]) => {
  const groups = new Map<string, { key: string; label: string; items: NewsItem[] }>()

  items.forEach(item => {
    const date = new Date(item.pubDate)
    const isValidDate = !Number.isNaN(date.getTime())
    const label = isValidDate
      ? date.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'Tanggal tidak diketahui'

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    const key = isValidDate ? formatter.format(date) : 'unknown'

    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] })
    }

    groups.get(key)!.items.push(item)
  })

  return Array.from(groups.values())
}
export default function BloombergTerminal() {
  const [newsSources, setNewsSources] = useState<RSSFeed[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [isMounted, setIsMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedNewsIndex, setSelectedNewsIndex] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const router = useRouter()

  const filteredNews = useMemo(() => {
    const selectedCategoryKey = selectedCategory.toUpperCase()
    return news
      .filter(item => {
        const itemCategoryKey = (item.category || 'ALL').toUpperCase()
        return selectedCategoryKey === 'ALL' || itemCategoryKey === selectedCategoryKey
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  }, [news, selectedCategory])

  const groupedNews = useMemo(() => {
    return filteredNews.reduce((acc, item) => {
      const key = item.category || 'Uncategorized'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as { [key: string]: NewsItem[] })
  }, [filteredNews])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchNews()
    fetchRssFeeds()
    if (autoRefresh) {
      const interval = setInterval(fetchNews, 30000) // Auto refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault()
        router.push('/search')
      } else if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault()
        fetchNews()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedNewsIndex(prev => Math.min(prev + 1, filteredNews.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedNewsIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filteredNews[selectedNewsIndex]) {
        window.open(filteredNews[selectedNewsIndex].link, '_blank')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNewsIndex, filteredNews, router])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/news')
      const data = await response.json()
      setNews(data)
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRssFeeds = async () => {
    try {
      const rssFeeds = await getRssFeeds();
      setNewsSources(rssFeeds);
    } catch (error) {
      console.error('Error fetching RSS feeds:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'JUST NOW'
    if (minutes < 60) return `${minutes}M AGO`
    if (hours < 24) return `${hours}H AGO`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TerminalHeader = () => (
    <div className="terminal-header px-4 py-3" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-slate-700" />
            <span className="text-slate-900 font-semibold terminal-text tracking-tight">ASETPEDIA</span>
            <span className="text-slate-500 terminal-text text-xs uppercase tracking-[0.3em]">News</span>
          </div>
          <div className="hidden md:flex items-center space-x-3 text-xs text-slate-500">
            <span className="uppercase tracking-wide">Terbaru</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-emerald-600">Live</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-500">
          <Button
            onClick={() => router.push('/search')}
            className="flex items-center bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm terminal-text hover:bg-slate-100"
          >
            <Search className="w-3 h-3 mr-2 text-slate-500" />
            SEARCH PAGE
          </Button>
          <div suppressHydrationWarning>
            {isMounted
              ? currentTime.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
              : '--:--:--'}
          </div>
          <div className="font-medium" suppressHydrationWarning>
            {isMounted
              ? currentTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })
              : '---'}
          </div>
        </div>
      </div>
    </div>
  )

  const CategoryBar = () => (
    <div className="bg-white border-b border-slate-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap space-x-1">
          {CATEGORIES.map(category => {
            const categoryKey = category.toUpperCase()
            return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`category-button px-3 py-1 text-xs terminal-text font-medium ${
                selectedCategory === category
                  ? `${CATEGORY_COLORS[categoryKey]} active`
                  : 'text-slate-500'
              }`}
            >
              {category}
            </button>
            )
          })}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 text-xs terminal-text font-semibold ${
              autoRefresh ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            AUTO: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <span className="text-xs text-slate-500 terminal-text">
            {filteredNews.length} ITEMS
          </span>
        </div>
      </div>
    </div>
  )

  const RefreshBar = () => (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-end">
        <Button
          onClick={fetchNews}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-700 text-white text-sm terminal-text"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </Button>
      </div>
    </div>
  )

  const NewsList = ({ category, items }: { category: string; items: NewsItem[] }) => {
    const dateGroups = groupNewsByDate(items)

    return (
      <section className={`rounded-xl border ${CATEGORY_BG_COLORS[(category || 'ALL').toUpperCase()]} mb-6 shadow-sm`}>
        <div
          className="category-header flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: CATEGORY_ACCENT_COLORS[(category || 'ALL').toUpperCase()] }}
        >
          <h3 className={`font-semibold terminal-text tracking-wide ${CATEGORY_COLORS[(category || 'ALL').toUpperCase()]}`}>
            {category}
          </h3>
          <span className="text-xs text-slate-500 terminal-text">
            {items.length} ARTICLES
          </span>
        </div>
        <div className="p-4 space-y-6">
          {dateGroups.map(({ key, label, items: dateItems }) => (
            <div key={`${category}-${key}`} className="space-y-4">
              <div className="flex items-center text-xs text-slate-500 uppercase tracking-wide">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold">
                  {label}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {dateItems.map((item, index) => {
                  const newsKey = `${item.link}-${item.pubDate}-${index}`
                  const isSelected = filteredNews[selectedNewsIndex]?.link === item.link
                  const decodedTitle = decodeHtmlEntities(item.title).trim()
                  const formattedDescription = formatDescription(item.description)

                  return (
                    <article
                      key={newsKey}
                      className={`news-item rounded-lg border border-slate-200 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                        isSelected ? 'ring-2 ring-slate-300' : ''
                      }`}
                      onClick={() => window.open(item.link, '_blank')}
                      onMouseEnter={() => {
                        const index = filteredNews.findIndex(
                          newsItem => newsItem.link === item.link && newsItem.title === item.title
                        )

                        if (index !== -1) {
                          setSelectedNewsIndex(index)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold tracking-wide">
                          {item.source.toUpperCase()}
                        </span>
                        <span>{formatTime(item.pubDate)}</span>
                      </div>
                      {decodedTitle && (
                        <h4 className="mt-1 text-sm font-semibold text-slate-800 leading-snug">
                          {decodedTitle}
                        </h4>
                      )}
                      {formattedDescription && (
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                          {formattedDescription}
                        </p>
                      )}
                      <div className="mt-2 flex items-center text-sm font-medium text-slate-500">
                        <span>Baca selengkapnya</span>
                        <ArrowRight className="ml-2 h-4 w-4 text-slate-400" />
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const StatusBar = () => (
    <div className="status-bar px-4 py-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-4 text-xs text-slate-500">
          <span className="terminal-text">
            <Activity className="w-3 h-3 inline mr-1 text-emerald-500" />
            SYSTEM: ONLINE
          </span>
          <span className="terminal-text">
            <Database className="w-3 h-3 inline mr-1 text-blue-500" />
            FEEDS: {newsSources.length}
          </span>
          <span className="terminal-text">
            <Globe className="w-3 h-3 inline mr-1 text-purple-500" />
            SOURCES: {Object.keys(groupedNews).length}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="shortcut-hint text-slate-600">
            CTRL+R REFRESH
          </span>
          <span className="shortcut-hint text-slate-600">
            ↑↓ NAVIGATE
          </span>
          <span className="shortcut-hint text-slate-600">
            / SEARCH
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 terminal-text">
      <div className="h-screen flex flex-col">
        <TerminalHeader />
        <CategoryBar />
        <RefreshBar />
        
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="terminal-text">Loading latest headlines from RSS feeds...</span>
              </div>
            </div>
          ) : Object.keys(groupedNews).length > 0 ? (
            <div className="p-4">
              {Object.entries(groupedNews).map(([category, items]) => (
                <NewsList key={category} category={category} items={items} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <span className="text-slate-500 terminal-text">No news found for this filter.</span>
            </div>
          )}
        </div>

        <StatusBar />
      </div>
    </div>
  )
}
