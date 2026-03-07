'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { dummyCommitTimeline } from '@/lib/dummyData'
import type { CommitNode } from '@/lib/types'
import { GitCommit, GitMerge, FileText, Plus, Minus } from 'lucide-react'

function CommitTooltip({ commit }: { commit: CommitNode }) {
    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 rounded-xl glass-card shadow-2xl shadow-black/40 z-50 pointer-events-none">
            <div className="flex items-start gap-3 mb-3">
                <div
                    className={`mt-0.5 p-1.5 rounded-lg ${commit.type === 'merge'
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                >
                    {commit.type === 'merge' ? (
                        <GitMerge className="w-3.5 h-3.5" />
                    ) : (
                        <GitCommit className="w-3.5 h-3.5" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">
                        {commit.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {commit.author} · {commit.date}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {commit.filesChanged} files
                </span>
                <span className="flex items-center gap-1 text-green-400">
                    <Plus className="w-3 h-3" />
                    {commit.additions}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                    <Minus className="w-3 h-3" />
                    {commit.deletions}
                </span>
            </div>

            {/* Tooltip arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-r border-b border-border/30" />
        </div>
    )
}

export default function TimelinePreview() {
    const [hoveredCommit, setHoveredCommit] = useState<string | null>(null)

    // Calculate the max values for sizing
    const maxFiles = Math.max(...dummyCommitTimeline.map((c) => c.filesChanged))

    return (
        <section className="relative py-32 overflow-hidden">
            {/* Background accent */}
            <div
                className="gradient-orb w-[400px] h-[400px] top-1/4 -left-32"
                style={{ background: 'oklch(0.50 0.15 290)' }}
            />

            <div className="max-w-7xl mx-auto px-6">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                            Commit Timeline
                        </span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                        See how the codebase evolved. Every node is a commit or PR merge —
                        hover to explore the details.
                    </p>
                </motion.div>

                {/* Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    {/* Timeline container with horizontal scroll */}
                    <div className="overflow-x-auto pb-6 -mx-6 px-6">
                        <div className="relative min-w-[800px]">
                            {/* Timeline line */}
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                            {/* Commit nodes */}
                            <div className="relative flex items-center justify-between py-20">
                                {dummyCommitTimeline.map((commit, index) => {
                                    const nodeSize =
                                        16 + (commit.filesChanged / maxFiles) * 24
                                    const isHovered = hoveredCommit === commit.sha
                                    const isMerge = commit.type === 'merge'

                                    return (
                                        <motion.div
                                            key={commit.sha}
                                            initial={{ opacity: 0, scale: 0 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{
                                                duration: 0.4,
                                                delay: index * 0.06,
                                                type: 'spring',
                                                stiffness: 200,
                                            }}
                                            className="relative flex flex-col items-center"
                                            onMouseEnter={() => setHoveredCommit(commit.sha)}
                                            onMouseLeave={() => setHoveredCommit(null)}
                                        >
                                            {/* Tooltip */}
                                            {isHovered && <CommitTooltip commit={commit} />}

                                            {/* Node */}
                                            <motion.div
                                                animate={{
                                                    scale: isHovered ? 1.3 : 1,
                                                    boxShadow: isHovered
                                                        ? isMerge
                                                            ? '0 0 24px oklch(0.65 0.2 280 / 50%)'
                                                            : '0 0 24px oklch(0.65 0.2 250 / 50%)'
                                                        : '0 0 0px transparent',
                                                }}
                                                transition={{ duration: 0.2 }}
                                                className={`rounded-full cursor-pointer transition-colors duration-200 ${isMerge
                                                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 border-2 border-violet-400/30'
                                                        : 'bg-gradient-to-br from-blue-500 to-cyan-600 border-2 border-blue-400/30'
                                                    }`}
                                                style={{
                                                    width: nodeSize,
                                                    height: nodeSize,
                                                }}
                                            />

                                            {/* SHA label below */}
                                            <span className="mt-3 text-[10px] font-mono text-muted-foreground/60">
                                                {commit.sha.slice(0, 7)}
                                            </span>

                                            {/* Vertical connector */}
                                            <div
                                                className={`absolute top-1/2 w-px ${index % 2 === 0
                                                        ? '-translate-y-full h-6'
                                                        : 'h-6'
                                                    } ${isMerge ? 'bg-violet-500/30' : 'bg-blue-500/30'
                                                    }`}
                                            />
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600" />
                            Commit
                        </span>
                        <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
                            PR Merge
                        </span>
                        <span className="flex items-center gap-2 text-muted-foreground/50">
                            Node size = files changed
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
