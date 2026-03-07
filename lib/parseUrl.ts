import type { ParsedUrl } from './types'

export function parseGithubUrl(input: string): ParsedUrl {
    try {
        let url = input.trim()
        url = url.replace(/^https?:\/\//, '')
        url = url.replace(/^github\.com\//, '')

        // Remove trailing slash if present
        url = url.replace(/\/$/, '')

        const parts = url.split('/')

        if (parts.length < 2) return null
        if (parts.length === 2) {
            // e.g. owner/repo -> default branch needs to be fetched
            return { owner: parts[0], repo: parts[1], sha: '' }
        }

        if (parts[2] !== 'tree' || parts.length < 4) return null

        return { owner: parts[0], repo: parts[1], sha: parts[3] }
    } catch {
        return null
    }
}
