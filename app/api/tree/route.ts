import { NextRequest, NextResponse } from 'next/server';
import { getFileTree, getCommitHistory, computeChurnScores } from '@/lib/github';
import type { TreeApiResponse } from '@/lib/types';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8000';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');
        const sha = searchParams.get('sha');

        if (!owner || !repo || !sha) {
            return NextResponse.json(
                { error: 'Missing required query params: owner, repo, sha' },
                { status: 400 }
            );
        }

        let tree;
        try {
            tree = await getFileTree(owner, repo, sha);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            if (message.includes('404')) {
                if (sha === 'main') {
                    try {
                        const { getDefaultBranch } = await import('@/lib/github');
                        const defaultBranch = await getDefaultBranch(owner, repo);
                        if (defaultBranch !== 'main') {
                            return NextResponse.json(
                                { action: 'redirect', destination: `/${owner}/${repo}/tree/${defaultBranch}` },
                                { status: 404 }
                            );
                        }
                    } catch (e) {
                        // ignore and fall through to standard 404
                    }
                }

                return NextResponse.json(
                    { error: `Repository not found: ${owner}/${repo}` },
                    { status: 404 }
                );
            }
            throw err;
        }

        const { commits, timeline } = await getCommitHistory(owner, repo);
        const churnMap = computeChurnScores(commits);

        const enrichedTree = tree.map((node) => ({
            ...node,
            churnScore: churnMap[node.path] ?? 0,
        }));

        const totalFiles = enrichedTree.filter((n) => n.type === 'blob').length;
        const totalFolders = enrichedTree.filter((n) => n.type === 'tree').length;

        // Async RAG ingestion in background - errors here shouldn't break the Tree render
        if (enrichedTree && enrichedTree.length > 0) {
            triggerRagIngest(owner, repo, sha, enrichedTree, churnMap).catch((err) => {
                console.error('[/api/tree] Background RAG ingest failed:', err instanceof Error ? err.message : String(err));
            });
        }

        return NextResponse.json({
            tree: enrichedTree,
            totalFiles,
            totalFolders,
            churnMap: churnMap,
            timeline: timeline
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error('[/api/tree]', message);

        if (message.includes('rate limit')) {
            return NextResponse.json(
                { error: 'GitHub API rate limit exceeded. Try again later.' },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function triggerRagIngest(
    owner: string,
    repo: string,
    sha: string,
    tree: { path: string; type: string; size: number; sha: string; churnScore: number }[],
    churnMap: Record<string, number>
): Promise<void> {
    fetch(`${RAG_SERVICE_URL}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, sha, tree, churnMap }),
    })
        .then((res) => {
            if (!res.ok) {
                console.warn(`[rag-ingest] Failed with status ${res.status}`);
            } else {
                console.log(`[rag-ingest] Triggered for ${owner}/${repo}@${sha}`);
            }
        })
        .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[rag-ingest] Service unreachable: ${msg}`);
        });
}
