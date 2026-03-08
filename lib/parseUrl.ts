import type { ParsedUrl } from './types'

export function parseGithubUrl(input: string): ParsedUrl {
    try {
        let url = input.trim()
        url = url.replace(/^https?:\/\//, '')
        url = url.replace(/^github\.com\//, '')

        // Remove trailing slash if present
        url = url.replace(/\/$/, '')

        const parts = url.split('/').map((p) => p.trim()).filter(Boolean)

        if (parts.length < 2) return null

        let owner = parts[0]
        let repo = parts[1]

        // Strip .git suffix from repo name
        repo = repo.replace(/\.git$/, '')

        if (!owner || !repo) return null

        if (parts.length === 2) {
            // e.g. owner/repo -> default branch needs to be fetched
            return { owner, repo, sha: '' }
        }

        if (parts[2] !== 'tree' || parts.length < 4) return null

        // Join remaining parts to support multi-segment branches (e.g., feature/my-branch)
        const sha = parts.slice(3).join('/')

        if (!sha) return null

        return { owner, repo, sha }
    } catch {
        return null
    }
}
