'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseGitHubUrl } from '@/lib/parseUrl'
import { ArrowRight, Github } from 'lucide-react'
import { GLSLHills } from '@/components/ui/glsl-hills'

export default function HeroSection() {
    const [url, setUrl] = useState('')
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault()
            setError(null)

            if (!url.trim()) {
                setError('Please enter a GitHub repository URL')
                return
            }

            const parsed = parseGitHubUrl(url)
            if (!parsed) {
                setError(
                    'Invalid URL. Use format: github.com/owner/repo/tree/branch-or-sha'
                )
                return
            }

            router.push(`/${parsed.owner}/${parsed.repo}/tree/${parsed.sha}`)
        },
        [url, router]
    )

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* GLSLHills 3D Background */}
            <div className="absolute inset-0 z-0">
                <GLSLHills
                    width="100%"
                    height="100%"
                    cameraZ={150}
                    speed={0.3}
                />
            </div>

            {/* Subtle gradient orbs on top for color depth */}
            <div
                className="gradient-orb w-[500px] h-[500px] -top-32 -left-32 z-[2]"
                style={{ background: 'oklch(0.55 0.2 250 / 20%)' }}
            />
            <div
                className="gradient-orb w-[400px] h-[400px] -bottom-24 -right-24 z-[2]"
                style={{ background: 'oklch(0.55 0.15 280 / 20%)' }}
            />

            {/* Bottom gradient fade for smooth section transition */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent z-[3]" />

            {/* Hero content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pointer-events-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm text-sm text-muted-foreground"
                >
                    <Github className="w-4 h-4" />
                    <span>Open-source codebase intelligence</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
                >
                    <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent glow-text">
                        Recon
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4"
                >
                    Understand any codebase in minutes
                </motion.p>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-base text-muted-foreground/70 max-w-xl mx-auto mb-12"
                >
                    Visualize file churn, trace dependencies, and explore repository
                    structure through interactive heatmap treemaps — all from a single URL.
                </motion.p>

                {/* Input form */}
                <motion.form
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    onSubmit={handleSubmit}
                    className="max-w-2xl mx-auto"
                >
                    <div className="relative flex items-center gap-3 p-2 rounded-2xl glass-card glow-blue">
                        <div className="flex-1 relative">
                            <Input
                                type="text"
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value)
                                    if (error) setError(null)
                                }}
                                placeholder="Paste a GitHub URL — github.com/owner/repo/tree/sha"
                                className="h-14 pl-5 pr-4 bg-transparent border-0 text-base text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                id="repo-url-input"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-blue-600/20 transition-all duration-300 cursor-pointer"
                            id="explore-repo-button"
                        >
                            <span className="hidden sm:inline">Explore Repo</span>
                            <ArrowRight className="w-5 h-5 sm:ml-2" />
                        </Button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 text-sm text-destructive text-left pl-4"
                        >
                            {error}
                        </motion.p>
                    )}
                </motion.form>

                {/* Example URL hint */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-6 text-xs text-muted-foreground/50"
                >
                    Try: github.com/facebook/react/tree/main
                </motion.p>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                </motion.div>
            </motion.div>
        </section>
    )
}
