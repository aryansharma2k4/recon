import type { TreeResponse, ExplainResponse } from './types'

const treeCache = new Map<string, TreeResponse>()
const explainCache = new Map<string, ExplainResponse>()

export function getCacheKey(owner: string, repo: string, sha: string): string {
    return `${owner}/${repo}/${sha}`
}

export function getTreeCache(key: string): TreeResponse | undefined {
    return treeCache.get(key)
}

export function setTreeCache(key: string, data: TreeResponse): void {
    treeCache.set(key, data)
}

export function getExplainCache(filePath: string): ExplainResponse | undefined {
    return explainCache.get(filePath)
}

export function setExplainCache(filePath: string, data: ExplainResponse): void {
    explainCache.set(filePath, data)
}
