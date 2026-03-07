import type { ParsedUrl } from './types'

export function parseGithubUrl(input: string): ParsedUrl {
    try {
        let url = input.trim()
        url = url.replace(/^https?:\/\//, '')
        url = url.replace(/^github\.com\//, '')
        const parts = url.split('/')
        if (parts.length < 4) return null
        if (parts[2] !== 'tree') return null
        return { owner: parts[0], repo: parts[1], sha: parts[3] }
    } catch {
        return null
    }
}
