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
    router.push(`/${parsed.owner}/${parsed.repo}/tree/${parsed.sha}`)
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
      {/* Header */}
      <header className="fixed top-0 left-0 px-6 py-4 z-10">
        <span
          className="text-base font-bold"
          style={{ color: 'var(--accent)' }}
        >
          Recon
        </span>
      </header>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[560px] flex flex-col items-center">
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Recon
          </h1>
          <p
            className="mt-3 text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Understand any codebase instantly.
          </p>

          <form onSubmit={handleSubmit} className="w-full mt-8">
            <div
              className={`flex items-center rounded-lg overflow-hidden ${shaking ? 'shake' : ''}`}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${error ? 'var(--heat-hot)' : 'var(--border)'}`,
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError('') }}
                placeholder="github.com/owner/repo/tree/sha"
                className="flex-1 px-4 py-3 bg-transparent outline-none text-sm"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--mono)',
                }}
              />
              <button
                type="submit"
                className="px-5 py-3 text-sm font-medium whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                }}
              >
                Explore →
              </button>
            </div>

            {error && (
              <p
                className="mt-2 text-xs"
                style={{ color: 'var(--heat-hot)' }}
              >
                {error}
              </p>
            )}
          </form>

          <button
            onClick={fillExample}
            className="mt-3 text-xs cursor-pointer bg-transparent border-none"
            style={{ color: 'var(--text-muted)' }}
          >
            e.g. {EXAMPLE_URL}
          </button>
        </div>
      </div>
    </main>
  )
}
