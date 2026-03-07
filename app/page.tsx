'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseGithubUrl } from '@/lib/parseUrl'

const EXAMPLE_URL = 'github.com/vercel/next.js/tree/canary'

export default function Home() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseGithubUrl(input)
    if (!parsed) {
      setError('Invalid URL — use format: github.com/owner/repo/tree/sha')
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      return
    }
    setError('')
    if (parsed.sha === '') {
      router.push(`/${parsed.owner}/${parsed.repo}`)
    } else {
      router.push(`/${parsed.owner}/${parsed.repo}/tree/${parsed.sha}`)
    }
  }

  function fillExample() {
    setInput(EXAMPLE_URL)
    setError('')
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[560px] flex flex-col items-center">
          <h1
            className="text-4xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Recon
          </h1>
          <p
            className="mt-2 text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            Understand any codebase instantly.
          </p>

          <form onSubmit={handleSubmit} className="w-full mt-10">
            <div className={`flex flex-col sm:flex-row items-stretch gap-3 ${shaking ? 'shake' : ''}`}>
              <div className="flex flex-1">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border/20 bg-muted px-3 text-sm text-foreground/60">
                  https://
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError('') }}
                  placeholder="github.com/owner/repo"
                  className={`w-full rounded-r-md border bg-background px-4 py-2 text-sm text-foreground placeholder:text-foreground/50 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 ${error ? 'border-destructive' : 'border-border/20'}`}
                  style={{ fontFamily: 'var(--mono)' }}
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 whitespace-nowrap cursor-pointer"
              >
                Explore →
              </button>
            </div>

            {error && (
              <p
                className="mt-2 text-xs text-center"
                style={{ color: 'var(--heat-hot)' }}
              >
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
