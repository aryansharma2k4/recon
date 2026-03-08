export type FileNode = {
    path: string
    type: 'blob' | 'tree'
    size: number
    sha: string
    churnScore: number
}

export type FileContext = {
    filePath: string
    content: string
    dependencies: string[]
    dependents: string[]
}

export type ParsedUrl = {
    owner: string
    repo: string
    sha: string
} | null

export type TimelineEvent = {
    sha: string
    url: string
    message: string
    authorName: string
    authorAvatar: string
    date: string
}

export type TreeApiResponse = {
    tree: FileNode[]
    totalFiles: number
    totalFolders: number
    churnMap: Record<string, number>
    timeline: TimelineEvent[]
}

export type CommitFile = {
    filename: string
    status: string
}

export type Commit = {
    sha: string
    files: CommitFile[]
}

export type CommitNode = {
    sha: string
    message: string
    author: string
    date: string
    filesChanged: number
    additions: number
    deletions: number
    type: 'commit' | 'merge'
}

export type ExplainResponse = {
    summary: string
    read_first: string[]
    depends_on: string[]
    used_by: string[]
    relevant_chunks: { path: string; name: string; summary: string }[]
}

export type TreeResponse = TreeApiResponse
