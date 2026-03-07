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

export type TreeApiResponse = {
  tree: FileNode[]
  totalFiles: number
  totalFolders: number
  churnMap: Record<string, number>
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
