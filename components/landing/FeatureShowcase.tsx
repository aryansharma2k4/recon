'use client'

import { motion } from 'framer-motion'
import {
    Flame,
    GitFork,
    Clock,
    Zap,
} from 'lucide-react'

const features = [
    {
        icon: Flame,
        title: 'Instant Heatmaps',
        description:
            'See which files are changed most often at a glance. Color-coded treemaps reveal churn hotspots instantly — no setup required.',
        gradient: 'from-orange-500 to-red-500',
        glowColor: 'oklch(0.65 0.2 30)',
    },
    {
        icon: GitFork,
        title: 'Deep Code Insights',
        description:
            'Trace import chains and dependency graphs. Understand how files are connected and which modules are the most coupled.',
        gradient: 'from-blue-500 to-cyan-500',
        glowColor: 'oklch(0.65 0.2 230)',
    },
    {
        icon: Clock,
        title: 'Timeline View',
        description:
            'Watch how the codebase evolved commit by commit. See PR merges, file modifications, and development patterns over time.',
        gradient: 'from-violet-500 to-purple-500',
        glowColor: 'oklch(0.65 0.2 280)',
    },
    {
        icon: Zap,
        title: 'Zero Setup',
        description:
            'Just paste a GitHub URL and explore. No installation, no configuration, no access tokens. Works with any public repository.',
        gradient: 'from-emerald-500 to-teal-500',
        glowColor: 'oklch(0.65 0.2 160)',
    },
]

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
}

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

export default function FeatureShowcase() {
    return (
        <section className="relative py-32 overflow-hidden">
            {/* Background gradient */}
            <div
                className="gradient-orb w-[500px] h-[500px] top-0 right-0"
                style={{ background: 'oklch(0.45 0.15 250)' }}
            />

            <div className="max-w-7xl mx-auto px-6">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-20"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            Built for Developers
                        </span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                        Powerful tools to understand unfamiliar codebases without reading
                        every file.
                    </p>
                </motion.div>

                {/* Feature cards grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            variants={cardVariants}
                            whileHover={{
                                y: -4,
                                transition: { duration: 0.2 },
                            }}
                            className="group relative p-8 rounded-2xl glass-card transition-all duration-300"
                        >
                            {/* Hover glow effect */}
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                style={{
                                    boxShadow: `0 0 60px -20px ${feature.glowColor}`,
                                }}
                            />

                            <div className="relative z-10">
                                {/* Icon */}
                                <div
                                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-lg`}
                                    style={{
                                        boxShadow: `0 8px 24px -8px ${feature.glowColor}`,
                                    }}
                                >
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-semibold mb-3 text-foreground">
                                    {feature.title}
                                </h3>

                                {/* Description */}
                                <p className="text-muted-foreground leading-relaxed text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
