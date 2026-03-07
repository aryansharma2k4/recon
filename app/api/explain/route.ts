import { NextRequest, NextResponse } from 'next/server';
import { assembleFileContext } from '@/lib/context';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8000';
const RAG_TIMEOUT_MS = 30_000;

type ExplainRequestBody = {
    owner: string;
    repo: string;
    sha: string;
    filePath: string;
};

type RagQueryResponse = {
    summary: string;
    read_first: string[];
    depends_on: string[];
    used_by: string[];
    relevant_chunks: { path: string; name: string; summary: string }[];
};

type FallbackResponse = {
    filePath: string;
    content: string;
    summary: string | null;
    read_first: string[];
    depends_on: string[];
    used_by: string[];
    relevant_chunks: { path: string; name: string; summary: string }[];
};

export async function POST(request: NextRequest) {
    try {
        let body: ExplainRequestBody;
        try {
            body = (await request.json()) as ExplainRequestBody;
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const { owner, repo, sha, filePath } = body;

        if (!owner || !repo || !sha || !filePath) {
            return NextResponse.json(
                { error: 'Missing required fields: owner, repo, sha, filePath' },
                { status: 400 }
            );
        }

        const ragResult = await queryRagService(owner, repo, sha, filePath);

        if (ragResult) {
            return NextResponse.json(ragResult);
        }

        console.warn('[/api/explain] RAG unavailable, falling back to local context');
        const fallbackCtx = await assembleFileContext(owner, repo, sha, filePath);

        const fallback: FallbackResponse = {
            filePath: fallbackCtx.filePath,
            content: fallbackCtx.content,
            summary: null,
            read_first: [],
            depends_on: fallbackCtx.dependencies || [],
            used_by: fallbackCtx.dependents || [],
            relevant_chunks: [],
        };

        return NextResponse.json(fallback);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error('[/api/explain]', message);

        if (message.includes('rate limit')) {
            return NextResponse.json(
                { error: message },
                { status: 429 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function queryRagService(
    owner: string,
    repo: string,
    sha: string,
    filePath: string
): Promise<RagQueryResponse | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

        const res = await fetch(`${RAG_SERVICE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo, sha, file_path: filePath }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.status === 400) {
            console.warn('[rag-query] Not ingested yet, falling back');
            return null;
        }

        if (res.status === 429) {
            console.warn('[rag-query] Rate limit exceeded');
            throw new Error('Gemini API rate limit exceeded. Please try again later.');
        }

        if (!res.ok) {
            console.warn(`[rag-query] Failed with status ${res.status}`);
            return null;
        }

        const data = (await res.json()) as RagQueryResponse;
        return data;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('abort')) {
            console.warn('[rag-query] Timed out after 10s');
        } else {
            console.warn(`[rag-query] Unreachable: ${msg}`);
        }
        return null;
    }
}
