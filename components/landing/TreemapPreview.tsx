'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as d3 from 'd3'
import { dummyTreeData } from '@/lib/dummyData'
import type { FileNode } from '@/lib/types'

interface HierarchyData {
    name: string
    children?: HierarchyData[]
    size?: number
    churnScore?: number
    path?: string
}

function buildHierarchy(files: FileNode[]): HierarchyData {
    const root: HierarchyData = { name: 'root', children: [] }

    files
        .filter((f) => f.type === 'blob')
        .forEach((file) => {
            const parts = file.path.split('/')
            let current = root

            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    // Leaf node (file)
                    if (!current.children) current.children = []
                    current.children.push({
                        name: part,
                        size: file.size,
                        churnScore: file.churnScore,
                        path: file.path,
                    })
                } else {
                    // Directory node
                    if (!current.children) current.children = []
                    let child = current.children.find((c) => c.name === part)
                    if (!child) {
                        child = { name: part, children: [] }
                        current.children.push(child)
                    }
                    current = child
                }
            })
        })

    return root
}

export default function TreemapPreview() {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const hierarchy = useMemo(() => buildHierarchy(dummyTreeData), [])

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return

        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()
        svg.attr('width', width).attr('height', height)

        // Get max churn for scale
        const maxChurn = d3.max(dummyTreeData, (d) => d.churnScore) ?? 1

        // Color scale: cool blue → yellow → hot red (reversed RdYlBu)
        const colorScale = d3
            .scaleSequential()
            .domain([0, maxChurn])
            .interpolator((t: number) => d3.interpolateRdYlBu(1 - t))

        const root = d3
            .hierarchy(hierarchy)
            .sum((d) => d.size ?? 0)
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

        d3.treemap<HierarchyData>()
            .size([width, height])
            .paddingInner(2)
            .paddingOuter(4)
            .round(true)(root)

        const leaves = root.leaves()

        // Draw cells
        const cells = svg
            .selectAll('g')
            .data(leaves)
            .enter()
            .append('g')
            .attr(
                'transform',
                (d) =>
                    `translate(${(d as d3.HierarchyRectangularNode<HierarchyData>).x0},${(d as d3.HierarchyRectangularNode<HierarchyData>).y0})`
            )

        cells
            .append('rect')
            .attr(
                'width',
                (d) =>
                    (d as d3.HierarchyRectangularNode<HierarchyData>).x1 -
                    (d as d3.HierarchyRectangularNode<HierarchyData>).x0
            )
            .attr(
                'height',
                (d) =>
                    (d as d3.HierarchyRectangularNode<HierarchyData>).y1 -
                    (d as d3.HierarchyRectangularNode<HierarchyData>).y0
            )
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('fill', (d) => colorScale(d.data.churnScore ?? 0))
            .attr('opacity', 0)
            .attr('stroke', 'oklch(0.13 0.015 260)')
            .attr('stroke-width', 1)
            .transition()
            .duration(600)
            .delay((_, i) => i * 15)
            .attr('opacity', 0.85)

        // Add labels to rectangles big enough
        cells
            .filter((d) => {
                const node = d as d3.HierarchyRectangularNode<HierarchyData>
                return node.x1 - node.x0 > 60 && node.y1 - node.y0 > 24
            })
            .append('text')
            .attr('x', 6)
            .attr('y', 16)
            .text((d) => d.data.name)
            .attr('font-size', '10px')
            .attr('font-family', 'var(--font-geist-mono), monospace')
            .attr('fill', 'oklch(0.15 0 0)')
            .attr('opacity', 0)
            .transition()
            .duration(400)
            .delay((_, i) => 400 + i * 15)
            .attr('opacity', 0.9)
    }, [hierarchy])

    return (
        <section className="relative py-32 overflow-hidden">
            {/* Section header */}
            <div className="max-w-7xl mx-auto px-6 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
                            Heatmap Treemap
                        </span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                        Every rectangle is a file. Size shows file size. Color reveals churn
                        — blue means stable, red means hot.
                    </p>
                </motion.div>
            </div>

            {/* Treemap visualization */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="max-w-6xl mx-auto px-6"
            >
                <div
                    ref={containerRef}
                    className="relative w-full h-[420px] sm:h-[500px] rounded-2xl overflow-hidden glass-card p-1"
                >
                    <svg
                        ref={svgRef}
                        className="w-full h-full rounded-xl"
                        style={{ display: 'block' }}
                    />

                    {/* Legend */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
                        <span>Low churn</span>
                        <div className="flex gap-0.5">
                            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                                <div
                                    key={t}
                                    className="w-4 h-3 rounded-sm"
                                    style={{
                                        background: d3.interpolateRdYlBu(1 - t),
                                    }}
                                />
                            ))}
                        </div>
                        <span>High churn</span>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}
