import type { TreeResponse, ExplainResponse } from './types'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

type CacheEntry<T> = {
    data: T
    timestamp: number
}

class LRUCache<T> {
    private cache = new Map<string, CacheEntry<T>>()

    get(key: string): T | undefined {
        const entry = this.cache.get(key)
        if (!entry) return undefined

        // Check TTL
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            this.cache.delete(key)
            return undefined
        }

        // Move to end (most recently used)
        this.cache.delete(key)
        this.cache.set(key, entry)
        return entry.data
    }

    set(key: string, data: T): void {
        // Delete first to reset position
        this.cache.delete(key)

        // Evict oldest if at capacity
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const oldest = this.cache.keys().next().value
            if (oldest !== undefined) this.cache.delete(oldest)
        }

        this.cache.set(key, { data, timestamp: Date.now() })
    }
}

const treeCache = new LRUCache<TreeResponse>()
const explainCache = new LRUCache<ExplainResponse>()

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
