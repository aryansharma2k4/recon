import { redirect } from 'next/navigation'

export default async function RepoIndexRedirect({
    params
}: {
    params: Promise<{ owner: string; repo: string }>
}) {
    const { owner, repo } = await params

    // Directly redirect any /owner/repo hits to the default main branch tree
    redirect(`/${owner}/${repo}/tree/main`)
}
