import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Github } from 'lucide-react'

interface PageProps {
    params: Promise<{
        owner: string
        repo: string
        branch: string[]
    }>
}

export default async function RepositoryPage({ params }: PageProps) {
    const { owner, repo, branch } = await params

    if (!owner || !repo || !branch || branch.length === 0) {
        notFound()
    }

    const branchName = branch.join('/')

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Simple Topbar for now */}
            <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-4 md:px-6">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Github className="w-5 h-5" />
                        <span className="font-semibold text-lg">{owner} / {repo}</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-mono font-medium ml-2">
                            {branchName}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main content area placeholder */}
            <main className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm max-w-xl text-center shadow-2xl">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Github className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3 tracking-tight">Repository Visualizer</h1>
                    <p className="text-muted-foreground mb-6">
                        You&apos;ve successfully routed to <strong className="text-foreground">{owner}/{repo}</strong> on branch <strong className="text-foreground">{branchName}</strong>.
                        The visualization components will be mounted here.
                    </p>
                    <div className="flex flex-col gap-2 text-sm text-left bg-black/20 p-4 rounded-xl font-mono">
                        <div><span className="text-blue-400">Owner:</span> {owner}</div>
                        <div><span className="text-blue-400">Repo:</span> {repo}</div>
                        <div><span className="text-blue-400">Branch/SHA:</span> {branchName}</div>
                    </div>
                </div>
            </main>
        </div>
    )
}
