'use client'

type TopbarProps = {
    owner: string
    repo: string
    sha: string
    currentPath: string
    onNavigate: (path: string) => void
}

export default function Topbar({
    owner,
    repo,
    sha,
    currentPath,
    onNavigate,
}: TopbarProps) {
    const segments = currentPath
        ? currentPath.replace(/\/$/, '').split('/')
        : []

    return (
        <header
            className="h-12 flex items-center justify-between px-4 shrink-0"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
            }}
        >
            {/* Left: Logo */}
            <button
                onClick={() => onNavigate('')}
                className="text-sm font-bold cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--accent)' }}
            >
                Recon
            </button>

            {/* Center: Breadcrumb */}
            <nav className="flex items-center gap-1 text-xs overflow-hidden">
                <button
                    onClick={() => onNavigate('')}
                    className="cursor-pointer bg-transparent border-none hover:underline"
                    style={{
                        color: segments.length === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--mono)',
                        fontWeight: segments.length === 0 ? 600 : 400,
                    }}
                >
                    root
                </button>

                {segments.map((segment, i) => {
                    const isLast = i === segments.length - 1
                    const pathUpTo = segments.slice(0, i + 1).join('/') + '/'

                    return (
                        <span key={pathUpTo} className="flex items-center gap-1">
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            {isLast ? (
                                <span
                                    className="font-semibold truncate max-w-[160px]"
                                    style={{
                                        color: 'var(--text-primary)',
                                        fontFamily: 'var(--mono)',
                                    }}
                                >
                                    {segment}
                                </span>
                            ) : (
                                <button
                                    onClick={() => onNavigate(pathUpTo)}
                                    className="cursor-pointer bg-transparent border-none hover:underline truncate max-w-[120px]"
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontFamily: 'var(--mono)',
                                    }}
                                >
                                    {segment}
                                </button>
                            )}
                        </span>
                    )
                })}
            </nav>

            {/* Right: Repo + SHA */}
            <div className="flex items-center gap-2 text-xs">
                <span
                    style={{
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--mono)',
                    }}
                >
                    {owner}/{repo}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span
                    style={{
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--mono)',
                    }}
                >
                    @{sha.slice(0, 7)}
                </span>
            </div>
        </header>
    )
}
