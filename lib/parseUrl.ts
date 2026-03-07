import { ParsedUrl } from './types'

export function parseGitHubUrl(input: string): ParsedUrl {
    let url = input.trim()

    // strip protocol
    url = url.replace(/^https?:\/\//, '')

    // strip github.com/ prefix
    if (!url.startsWith('github.com/')) {
        return null
    }
    url = url.replace(/^github\.com\//, '')

    // remove trailing slash
    url = url.replace(/\/$/, '')

    const parts = url.split('/')

    // Expected format: owner/repo/tree/sha
    // parts[0] = owner, parts[1] = repo, parts[2] = "tree", parts[3] = sha
    if (parts.length < 4) {
        return null
    }

    const owner = parts[0]
    const repo = parts[1]
    const treeKeyword = parts[2]
    const sha = parts[3]

    if (!owner || !repo || treeKeyword !== 'tree' || !sha) {
        return null
    }

    return { owner, repo, sha }
}
