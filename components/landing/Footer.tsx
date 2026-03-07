'use client'

import { motion } from 'framer-motion'
import { Github } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="relative py-16 border-t border-border/30">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                    {/* Logo and tagline */}
                    <div className="flex items-center gap-4">
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Recon
                        </span>
                        <span className="text-sm text-muted-foreground/60">
                            Understand any codebase in minutes.
                        </span>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            <span>GitHub</span>
                        </a>
                        <span className="text-xs text-muted-foreground/40">
                            Built for developers, by developers.
                        </span>
                    </div>
                </motion.div>
            </div>
        </footer>
    )
}
