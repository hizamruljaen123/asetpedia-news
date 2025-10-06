'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, ArrowLeft, Search, ArrowRight } from 'lucide-react'

interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  category: string
  description?: string
  img?: string
}

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

const PAGE_SIZE = 50

export default function SearchResultsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('query')?.trim() ?? ''

  const [titleResults, setTitleResults] = useState<NewsItem[]>([])
  const [secondaryResults, setSecondaryResults] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(query)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setSearchTerm(query)
  }, [query])

  const totalResults = titleResults.length + secondaryResults.length
  const totalPages = totalResults > 0 ? Math.ceil(totalResults / PAGE_SIZE) : 1

  useEffect(() => {
    if (totalResults === 0 && currentPage !== 1) {
      setCurrentPage(1)
    } else if (totalResults > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalResults, totalPages, currentPage])

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = searchTerm.trim()
    if (!value) return

    setLoading(true)
    setHasSearched(true)
    setCurrentPage(1)
    router.replace(`/search?query=${value}`)

    try {
      const response = await fetch('/api/news')
      const data: NewsItem[] = await response.json()
      const lowerQuery = value.toLowerCase()
      const titleMatches: NewsItem[] = []
      const secondaryMatches: NewsItem[] = []

      data.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes(lowerQuery)
        const descriptionMatch = item.description?.toLowerCase().includes(lowerQuery)
        const sourceMatch = item.source.toLowerCase().includes(lowerQuery)

        if (titleMatch) {
          titleMatches.push(item)
        } else if (descriptionMatch || sourceMatch) {
          secondaryMatches.push(item)
        }
      })

      setTitleResults(titleMatches)
      setSecondaryResults(secondaryMatches)
    } catch (error) {
      console.error('Error fetching news:', error)
      setTitleResults([])
      setSecondaryResults([])
    } finally {
      setLoading(false)
    }
  }

  const combinedResults = [...titleResults, ...secondaryResults]
  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * PAGE_SIZE
  const endIndex = totalResults === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, totalResults)
  const pageItems = combinedResults.slice(startIndex, endIndex)

  const paginatedTitleResults: NewsItem[] = []
  const paginatedSecondaryResults: NewsItem[] = []

  pageItems.forEach((item, idx) => {
    const originalIndex = startIndex + idx
    if (originalIndex < titleResults.length) {
      paginatedTitleResults.push(item)
    } else {
      paginatedSecondaryResults.push(item)
    }
  })

  const showingFrom = totalResults === 0 ? 0 : startIndex + 1
  const showingTo = totalResults === 0 ? 0 : startIndex + pageItems.length
  const canGoPrev = currentPage > 1 && totalResults > 0
  const canGoNext = totalResults > 0 && currentPage < totalPages

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 terminal-text">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8">
        <header className="flex flex-col gap-4 pb-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              BACK
            </Button>
            <Button
              onClick={() => router.refresh()}
              className="bg-slate-900 hover:bg-slate-700 text-white text-sm"
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              REFRESH
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Search Results</h1>
            <p className="text-sm text-slate-500">
              Menampilkan berita yang cocok untuk kata kunci: <span className="font-semibold text-slate-700">{query || '-'}</span>
            </p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Cari berita lain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-slate-300 text-sm text-slate-700"
            />
            <Button type="submit" className="bg-slate-900 hover:bg-slate-700 text-white text-sm">
              <Search className="mr-2 h-4 w-4" />
              SEARCH
            </Button>
          </form>
        </header>

        <main className="flex-1">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-500">
              <Search className="h-6 w-6" />
              <p className="text-sm">Masukkan kata kunci kemudian tekan tombol search untuk melihat hasil.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading search results...
            </div>
          ) : totalResults > 0 ? (
            <div className="space-y-10 pb-12">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                <span>
                  Menampilkan {showingFrom}-{showingTo} dari {totalResults} hasil
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!canGoPrev}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Sebelumnya
                  </Button>
                  <span className="font-medium text-slate-600">
                    Halaman {totalResults === 0 ? 0 : currentPage} dari {totalResults === 0 ? 0 : totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={!canGoNext}
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>

              {paginatedTitleResults.length > 0 && (
                <section className="space-y-4">
                  <header>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Judul Paling Relevan</h2>
                  </header>
                  <div className="grid gap-4 md:grid-cols-3">
                    {paginatedTitleResults.map((item, index) => {
                      const newsKey = `${item.link}-title-${index}`
                      return (
                        <article
                          key={newsKey}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          onClick={() => window.open(item.link, '_blank')}
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold tracking-wide">{item.source.toUpperCase()}</span>
                            <span>{formatTime(item.pubDate)}</span>
                          </div>
                          <h2 className="mt-1 text-sm font-semibold text-slate-800 leading-snug">
                            {item.title}
                          </h2>
                          {item.description && (
                            <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-4">
                              {item.description}
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
                </section>
              )}

              {paginatedSecondaryResults.length > 0 && (
                <section className="space-y-4">
                  <header>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Kecocokan Lainnya</h2>
                  </header>
                  <div className="grid gap-4 md:grid-cols-3">
                    {paginatedSecondaryResults.map((item, index) => {
                      const newsKey = `${item.link}-secondary-${index}`
                      return (
                        <article
                          key={newsKey}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          onClick={() => window.open(item.link, '_blank')}
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold tracking-wide">{item.source.toUpperCase()}</span>
                            <span>{formatTime(item.pubDate)}</span>
                          </div>
                          <h2 className="mt-1 text-sm font-semibold text-slate-800 leading-snug">
                            {item.title}
                          </h2>
                          {item.description && (
                            <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-4">
                              {item.description}
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
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-500">
              <Search className="h-6 w-6" />
              <p className="text-sm">Tidak ditemukan berita yang sesuai. Coba kata kunci lain.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
