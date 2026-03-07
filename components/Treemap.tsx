'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import * as d3 from 'd3'
import type { FileNode } from '@/lib/types'

type TreemapProps = {
    data: FileNode[]
    currentPath: string
    onFileClick: (path: string) => void
    onFolderClick: (path: string) => void
    onNodeHover: (path: string, type: string) => void
}

type HierarchyNode = {
    name: string
    path: string
    type: 'blob' | 'tree'
    size: number
    churnScore: number
    children?: HierarchyNode[]
}

type TooltipState = {
    x: number
    y: number
    path: string
    size: number
    churnScore: number
} | null

export default function Treemap({
    data,
    currentPath,
    onFileClick,
    onFolderClick,
    onNodeHover,
}: TreemapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [tooltip, setTooltip] = useState<TooltipState>(null)
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            setDimensions({ width, height })
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const directChildren = useMemo(() => {
        const prefix = currentPath
        const result = new Map<string, HierarchyNode>()

        for (const node of data) {
            if (!node.path.startsWith(prefix) && prefix !== '') continue
            const remaining = prefix ? node.path.slice(prefix.length) : node.path
            if (!remaining) continue

            const parts = remaining.split('/')

            if (parts.length === 1 && node.type === 'blob') {
                result.set(node.path, {
                    name: parts[0],
                    path: node.path,
                    type: 'blob',
                    size: Math.max(node.size, 1),
                    churnScore: node.churnScore,
                })
            } else {
                const folderName = parts[0]
                const folderPath = prefix + folderName + '/'
                const existing = result.get(folderPath)
                if (existing) {
                    existing.size += Math.max(node.size, 1)
                    existing.churnScore = Math.max(existing.churnScore, node.churnScore)
                } else {
                    result.set(folderPath, {
                        name: folderName,
                        path: folderPath,
                        type: 'tree',
                        size: Math.max(node.size, 1),
                        churnScore: node.churnScore,
                    })
                }
            }
        }

        return Array.from(result.values())
    }, [data, currentPath])

    const maxChurn = useMemo(() => {
        if (data.length === 0) return 1
        return Math.max(...data.map((n) => n.churnScore), 1)
    }, [data])

    const colorScale = useMemo(() => {
        return d3
            .scaleSequential<string>()
            .domain([0, maxChurn])
            .interpolator(d3.interpolateRgb('#3B82F6', '#EF4444'))
    }, [maxChurn])

    const treemapNodes = useMemo(() => {
        if (directChildren.length === 0 || dimensions.width === 0) return []

        const root = d3
            .hierarchy<HierarchyNode>({
                name: 'root',
                path: '',
                type: 'tree',
                size: 0,
                churnScore: 0,
                children: directChildren,
            })
            .sum((d) => (d.children ? 0 : d.size))

        d3.treemap<HierarchyNode>()
            .size([dimensions.width, dimensions.height])
            .padding(3)
            .round(true)(root)

        return root.leaves() as d3.HierarchyRectangularNode<HierarchyNode>[]
    }, [directChildren, dimensions])

    const handleMouseMove = useCallback(
        (e: React.MouseEvent, node: HierarchyNode) => {
            setTooltip({
                x: e.clientX,
                y: e.clientY,
                path: node.path,
                size: node.size,
                churnScore: node.churnScore,
            })
        },
        []
    )

    const handleMouseEnter = useCallback(
        (node: HierarchyNode) => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
            hoverTimerRef.current = setTimeout(() => {
                onNodeHover(node.path, node.type)
            }, 300)
        },
        [onNodeHover]
    )

    const handleMouseLeave = useCallback(() => {
        setTooltip(null)
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current)
            hoverTimerRef.current = null
        }
    }, [])

    const handleClick = useCallback(
        (node: HierarchyNode) => {
            if (node.type === 'tree') {
                onFolderClick(node.path)
            } else {
                onFileClick(node.path)
            }
        },
        [onFileClick, onFolderClick]
    )

    if (directChildren.length === 0) {
        return (
            <div
                ref={containerRef}
                className="flex-1 flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-base)' }}
            >
                <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)' }}
                >
                    No files found in this path
                </p>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-base)' }}
        >
            {treemapNodes.map((leaf) => {
                const d = leaf.data
                const x = leaf.x0 ?? 0
                const y = leaf.y0 ?? 0
                const w = (leaf.x1 ?? 0) - x
                const h = (leaf.y1 ?? 0) - y
                const showLabel = w > 60 && h > 24

                return (
                    <div
                        key={d.path}
                        className="absolute cursor-pointer transition-[outline] duration-100"
                        style={{
                            left: x,
                            top: y,
                            width: w,
                            height: h,
                            backgroundColor:
                                d.type === 'tree'
                                    ? 'var(--bg-elevated)'
                                    : colorScale(d.churnScore),
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: 4,
                            outline: '2px solid transparent',
                        }}
                        onClick={() => handleClick(d)}
                        onMouseMove={(e) => handleMouseMove(e, d)}
                        onMouseEnter={() => handleMouseEnter(d)}
                        onMouseLeave={handleMouseLeave}
                        onFocus={() => handleMouseEnter(d)}
                    >
                        {showLabel && (
                            <span
                                className="block truncate select-none"
                                style={{
                                    fontSize: 11,
                                    fontFamily: 'var(--mono)',
                                    color: 'var(--text-primary)',
                                    lineHeight: '16px',
                                }}
                            >
                                {d.name}
                                {d.type === 'tree' ? '/' : ''}
                            </span>
                        )}
                    </div>
                )
            })}

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="fixed pointer-events-none"
                    style={{
                        left: tooltip.x + 12,
                        top: tooltip.y + 12,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '8px 12px',
                        zIndex: 9999,
                    }}
                >
                    <div
                        className="text-xs"
                        style={{
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {tooltip.path}
                    </div>
                    <div className="flex gap-3 mt-1">
                        <span
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)', fontSize: 11 }}
                        >
                            {(tooltip.size / 1024).toFixed(1)} KB
                        </span>
                        <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)', fontSize: 11 }}
                        >
                            {tooltip.churnScore} commits
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
