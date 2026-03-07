import { redirect } from 'next/navigation'
import { getDefaultBranch } from '@/lib/github'

export default async function RepoIndexRedirect({
    params
}: {
    params: Promise<{ owner: string; repo: string }>
}) {
    const { owner, repo } = await params

    try {
        const defaultBranch = await getDefaultBranch(owner, repo)
        redirect(`/${owner}/${repo}/tree/${defaultBranch}`)
    } catch (err) {
        // If it fails (e.g. repo not found or rate limit), fallback to main so the explorer page can show the actual error to the user
        redirect(`/${owner}/${repo}/tree/main`)
    }
}
