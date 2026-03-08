'use client'

import type { TimelineEvent } from '@/lib/types'

type CommitTimelineProps = {
    timeline: TimelineEvent[]
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)

    if (diffSecs < 60) return `${diffSecs}s ago`
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function CommitTimeline({ timeline }: CommitTimelineProps) {
    if (!timeline || timeline.length === 0) return null

    return (
        <section
            className="h-40 shrink-0 w-full overflow-hidden flex flex-col"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
            }}
        >
            <div
                className="px-4 py-2 shrink-0 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
            >
                <div className="flex items-center gap-2">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <h3
                        className="text-xs uppercase font-bold tracking-wider"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Commit Timeline
                    </h3>
                </div>
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
                    {timeline.length} Recent Commits
                </span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center px-4 gap-6 scroll-smooth">
                {timeline.map((event, index) => {
                    const isLast = index === timeline.length - 1
                    // Simplify commit message to first line
                    const title = event.message.split('\n')[0]

                    return (
                        <div key={event.sha} className="flex items-center h-full group shrink-0 relative py-4">
                            {/* Connector line to the next item */}
                            {!isLast && (
                                <div
                                    className="absolute top-1/2 left-[32px] w-[calc(100%+24px)] h-[2px] -translate-y-1/2"
                                    style={{ backgroundColor: 'var(--border)', zIndex: 0 }}
                                />
                            )}

                            {/* Card Item */}
                            <a
                                href={event.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-col z-10 p-3 rounded-lg transition-all min-w-[240px] max-w-[280px] cursor-pointer"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--accent)'
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <img
                                        src={event.authorAvatar}
                                        alt={event.authorName}
                                        className="w-6 h-6 rounded-full shrink-0"
                                        style={{ border: '1px solid var(--border)' }}
                                    />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {event.authorName}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            {formatRelativeTime(event.date)}
                                        </span>
                                    </div>
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-mono"
                                        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                    >
                                        {event.sha.substring(0, 7)}
                                    </span>
                                </div>
                                <p
                                    className="text-xs leading-relaxed truncate"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title={event.message}
                                >
                                    {title}
                                </p>
                            </a>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
