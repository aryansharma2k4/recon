'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import type { FileNode, ExplainResponse, TreeResponse } from '@/lib/types'
import {
    getTreeCache,
    setTreeCache,
    getExplainCache,
    setExplainCache,
    getCacheKey,
} from '@/lib/cache'
import Topbar from '@/components/Topbar'
import Treemap from '@/components/Treemap'
import InsightPanel from '@/components/InsightPanel'

type PageProps = {
    params: Promise<{
        owner: string
        repo: string
        sha: string
    }>
}

export default function ExplorerPage({ params }: PageProps) {
    const router = useRouter()
    // React 19 / Next 15 requires unwrapping async params in client components
    const { owner, repo, sha } = use(params)

    // State
    const [treeData, setTreeData] = useState<FileNode[]>([])
    const [currentPath, setCurrentPath] = useState<string>('')
    const [selectedPath, setSelectedPath] = useState<string | null>(null)
    const [explainData, setExplainData] = useState<ExplainResponse | null>(null)

    // Loading & Error states
    const [loadingTree, setLoadingTree] = useState(true)
    const [loadingExplain, setLoadingExplain] = useState(false)
    const [treeError, setTreeError] = useState<string | null>(null)
    const [explainError, setExplainError] = useState<string | null>(null)

    // --- 1. Fetch Tree on Mount ---
    useEffect(() => {
        let mounted = true
        const cacheKey = getCacheKey(owner, repo, sha)

        async function loadTree() {
            // Check cache first
            const cached = getTreeCache(cacheKey)
            if (cached) {
                setTreeData(cached.tree)
                setLoadingTree(false)
                return
            }

            try {
                setLoadingTree(true)
                setTreeError(null)

                const res = await fetch(`/api/tree?owner=${owner}&repo=${repo}&sha=${sha}`)
                if (!res.ok) {
                    throw new Error(`Failed to load tree: ${res.statusText}`)
                }

                const data = (await res.json()) as TreeResponse
                if (!mounted) return

                // Save to cache
                setTreeCache(cacheKey, data)
                setTreeData(data.tree)

                // Fire & forget prefetch for top 5 churned files
                const top5 = data.tree
                    .filter((f) => f.type === 'blob')
                    .sort((a, b) => b.churnScore - a.churnScore)
                    .slice(0, 5)

                Promise.all(top5.map((f) => prefetchExplain(f.path))).catch(console.error)
            } catch (err) {
                if (!mounted) return
                setTreeError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                if (mounted) setLoadingTree(false)
            }
        }

        loadTree()

        return () => {
            mounted = false
        }
    }, [owner, repo, sha])

    // --- Helper: Fetch Explain ---
    const fetchExplain = useCallback(
        async (filePath: string): Promise<ExplainResponse> => {
            const res = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo, sha, filePath }),
            })

            if (!res.ok) {
                throw new Error(`Failed to load analysis: ${res.statusText}`)
            }

            return await res.json()
        },
        [owner, repo, sha]
    )

    // --- Helper: Background Prefetch ---
    const prefetchExplain = useCallback(
        async (filePath: string) => {
            // Only prefetch if not in cache
            if (getExplainCache(filePath)) return

            try {
                const data = await fetchExplain(filePath)
                setExplainCache(filePath, data)
            } catch (err) {
                console.warn('Prefetch failed for', filePath, err)
            }
        },
        [fetchExplain]
    )

    // --- Event Handlers ---
    const handleNavigate = useCallback((path: string) => {
        setCurrentPath(path)
        setSelectedPath(null)
        setExplainData(null)
    }, [])

    const handleFolderClick = useCallback((path: string) => {
        setCurrentPath(path)
        setSelectedPath(null)
        setExplainData(null)
    }, [])

    const handleFileClick = useCallback(
        async (path: string) => {
            setSelectedPath(path)
            setExplainError(null)

            // Check cache first
            const cached = getExplainCache(path)
            if (cached) {
                setExplainData(cached)
                setLoadingExplain(false)
                return
            }

            // Fetch
            try {
                setLoadingExplain(true)
                const data = await fetchExplain(path)
                setExplainCache(path, data)
                setExplainData(data)
            } catch (err) {
                setExplainError(err instanceof Error ? err.message : 'Unknown error')
                setExplainData(null)
            } finally {
                setLoadingExplain(false)
            }
        },
        [fetchExplain]
    )

    const handleChipClick = useCallback(
        (path: string) => {
            // Find node in tree to check if folder or file
            const node = treeData.find((n) => n.path === path)
            if (node?.type === 'tree') {
                handleFolderClick(path + '/')
            } else {
                // Assume file if not found or explicitly file
                handleFileClick(path)
            }
        },
        [treeData, handleFolderClick, handleFileClick]
    )

    const handleNodeHover = useCallback(
        (path: string, type: string) => {
            if (type === 'blob') {
                prefetchExplain(path)
            }
        },
        [prefetchExplain]
    )

    // --- Render Error State (Tree) ---
    if (treeError) {
        return (
            <main
                className="min-h-screen flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: 'var(--bg-base)' }}
            >
                <div className="text-center">
                    <h2
                        className="text-2xl font-bold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Failed to load repository
                    </h2>
                    <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {treeError}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="text-sm px-4 py-2 rounded cursor-pointer mt-4"
                    style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--accent)',
                    }}
                >
                    ← Try another repo
                </button>
            </main>
        )
    }

    // --- Render Layout ---
    return (
        <main
            className="h-screen w-screen flex flex-col overflow-hidden"
            style={{ backgroundColor: 'var(--bg-base)' }}
        >
            <Topbar
                owner={owner}
                repo={repo}
                sha={sha}
                currentPath={currentPath}
                onNavigate={handleNavigate}
            />

            <div className="flex-1 flex overflow-hidden">
                {loadingTree ? (
                    // Skeleton loading state for Tree
                    <div className="flex-1 relative p-4 flex gap-2 flex-wrap content-start">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div
                                key={i}
                                className="skeleton"
                                style={{
                                    width: `${10 + ((i * 17) % 30)}%`,
                                    height: `${10 + ((i * 23) % 40)}%`,
                                    border: '1px solid var(--border)',
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <Treemap
                        data={treeData}
                        currentPath={currentPath}
                        onFileClick={handleFileClick}
                        onFolderClick={handleFolderClick}
                        onNodeHover={handleNodeHover}
                    />
                )}

                <InsightPanel
                    selectedPath={selectedPath}
                    explainData={explainData}
                    loading={loadingExplain}
                    error={explainError}
                    onChipClick={handleChipClick}
                    onRetry={() => selectedPath && handleFileClick(selectedPath)}
                />
            </div>
        </main>
    )
}
