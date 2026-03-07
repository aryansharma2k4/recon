'use client'

import type { ExplainResponse } from '@/lib/types'

type InsightPanelProps = {
    selectedPath: string | null
    explainData: ExplainResponse | null
    loading: boolean
    error: string | null
    onChipClick: (path: string) => void
    onRetry: () => void
}

function SectionLabel({ children }: { children: string }) {
    return (
        <h3
            className="text-[10px] uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-muted)' }}
        >
            {children}
        </h3>
    )
}

function Chip({
    path,
    onClick,
}: {
    path: string
    onClick: (path: string) => void
}) {
    return (
        <button
            onClick={() => onClick(path)}
            className="cursor-pointer bg-transparent text-left"
            style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '2px 8px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--accent)',
                transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
            }}
        >
            {path}
        </button>
    )
}

function Divider() {
    return (
        <div
            className="my-4"
            style={{ borderBottom: '1px solid var(--border)' }}
        />
    )
}

function SkeletonLines() {
    return (
        <div className="flex flex-col gap-3 py-6">
            <div className="skeleton h-3" style={{ width: '70%' }} />
            <div className="skeleton h-3" style={{ width: '90%' }} />
            <div className="skeleton h-3" style={{ width: '60%' }} />
        </div>
    )
}

export default function InsightPanel({
    selectedPath,
    explainData,
    loading,
    error,
    onChipClick,
    onRetry,
}: InsightPanelProps) {
    // STATE 1: Nothing selected
    if (!selectedPath) {
        return (
            <aside
                className="w-[30%] min-w-[280px] flex flex-col items-center justify-center"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border)',
                }}
            >
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <p
                    className="mt-3 text-sm"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Select a file to inspect
                </p>
                <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Hover files to prefetch
                </p>
            </aside>
        )
    }

    const fileName = selectedPath.split('/').pop() ?? selectedPath

    // STATE 2: Loading
    if (loading) {
        return (
            <aside
                className="w-[30%] min-w-[280px] overflow-y-auto"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border)',
                }}
            >
                <div className="p-4">
                    <p
                        className="text-xs truncate"
                        style={{
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        {selectedPath}
                    </p>
                    <p
                        className="text-base font-semibold mt-1"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {fileName}
                    </p>
                </div>
                <SkeletonLines />
            </aside>
        )
    }

    // Error state
    if (error) {
        return (
            <aside
                className="w-[30%] min-w-[280px] flex flex-col items-center justify-center gap-3"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border)',
                }}
            >
                <p
                    className="text-sm px-4 text-center leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {error}
                </p>
                <button
                    onClick={onRetry}
                    className="text-xs px-3 py-1.5 rounded cursor-pointer"
                    style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--accent)',
                    }}
                >
                    Retry
                </button>
            </aside>
        )
    }

    // STATE 3: Loaded
    if (!explainData) return null

    return (
        <aside
            className="w-[30%] min-w-[280px] overflow-y-auto flex flex-col"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderLeft: '1px solid var(--border)',
            }}
        >
            {/* Sticky header */}
            <div
                className="p-4 sticky top-0 z-10"
                style={{ backgroundColor: 'var(--bg-surface)' }}
            >
                <p
                    className="text-xs truncate"
                    style={{
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    {selectedPath}
                </p>
                <p
                    className="text-base font-semibold mt-1"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {fileName}
                </p>
            </div>

            <div className="px-4 pb-6">
                <Divider />

                {/* Summary */}
                <SectionLabel>Summary</SectionLabel>
                <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {explainData.summary}
                </p>

                {/* Read First */}
                {explainData.read_first?.length > 0 && (
                    <>
                        <Divider />
                        <SectionLabel>Read First</SectionLabel>
                        <ol className="flex flex-col gap-1.5">
                            {explainData.read_first.map((path, i) => (
                                <li key={path} className="flex items-center gap-2">
                                    <span
                                        className="text-[10px] w-5 shrink-0 text-right"
                                        style={{
                                            fontFamily: 'var(--mono)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <Chip path={path} onClick={onChipClick} />
                                </li>
                            ))}
                        </ol>
                    </>
                )}

                {/* Depends On */}
                {explainData.depends_on?.length > 0 && (
                    <>
                        <Divider />
                        <SectionLabel>Depends On</SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {explainData.depends_on.map((path) => (
                                <Chip key={path} path={path} onClick={onChipClick} />
                            ))}
                        </div>
                    </>
                )}

                {/* Used By */}
                {explainData.used_by?.length > 0 && (
                    <>
                        <Divider />
                        <SectionLabel>Used By</SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {explainData.used_by.map((path) => (
                                <Chip key={path} path={path} onClick={onChipClick} />
                            ))}
                        </div>
                    </>
                )}

                {/* Relevant Chunks */}
                {explainData.relevant_chunks?.length > 0 && (
                    <>
                        <Divider />
                        <SectionLabel>Related Chunks</SectionLabel>
                        <div className="flex flex-col gap-2">
                            {explainData.relevant_chunks.map((chunk, i) => (
                                <div
                                    key={`${chunk.path}-${chunk.name}-${i}`}
                                    className="rounded-md p-3"
                                    style={{
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <p
                                        className="text-xs font-semibold"
                                        style={{
                                            fontFamily: 'var(--mono)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {chunk.name}
                                    </p>
                                    <p
                                        className="text-[11px] mt-0.5"
                                        style={{
                                            fontFamily: 'var(--mono)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        {chunk.path}
                                    </p>
                                    <p
                                        className="text-xs mt-2 leading-relaxed"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {chunk.summary}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </aside>
    )
}
