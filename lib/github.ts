import type { FileNode, Commit, CommitFile } from './types';

const GITHUB_API = 'https://api.github.com';
const MAX_FILE_SIZE = 500 * 1024; // 500 KB


function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}


function checkRateLimit(res: Response): void {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const resetEpoch = res.headers.get('x-ratelimit-reset');

    if (remaining !== null && Number(remaining) <= 10) {
        const resetDate = resetEpoch
            ? new Date(Number(resetEpoch) * 1000).toISOString()
            : 'unknown';
        console.warn(
            `[github] Rate limit low: ${remaining} requests remaining. Resets at ${resetDate}`
        );
    }

    if (remaining === '0' && res.status === 403) {
        const resetDate = resetEpoch
            ? new Date(Number(resetEpoch) * 1000).toISOString()
            : 'unknown';
        throw new Error(
            `GitHub API rate limit exceeded. Resets at ${resetDate}`
        );
    }
}

type GitHubTreeItem = {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
};

type GitHubTreeResponse = {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
};

type GitHubCommitListItem = {
    sha: string;
    url: string;
};

type GitHubCommitDetail = {
    sha: string;
    files?: { filename: string; status: string }[];
};

type GitHubContentResponse = {
    type: string;
    encoding: string;
    content: string;
    name: string;
    path: string;
    sha: string;
    size: number;
};

export async function getFileTree(
    owner: string,
    repo: string,
    sha: string
): Promise<FileNode[]> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
    const res = await fetch(url, { headers: getHeaders() });
    checkRateLimit(res);

    if (!res.ok) {
        throw new Error(
            `GitHub getFileTree failed: ${res.status} ${res.statusText}`
        );
    }

    const data: GitHubTreeResponse = await res.json() as GitHubTreeResponse;

    if (data.truncated) {
        console.warn('[github] Tree response was truncated — repo may be very large');
    }

    return data.tree
        .filter((item) => item.type === 'blob' ? (item.size ?? 0) <= MAX_FILE_SIZE : true)
        .map((item) => ({
            path: item.path,
            type: item.type,
            size: item.size ?? 0,
            sha: item.sha,
            churnScore: 0,
        }));
}


export async function getCommitHistory(
    owner: string,
    repo: string
): Promise<Commit[]> {
    const listUrl = `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=100`;
    const listRes = await fetch(listUrl, { headers: getHeaders() });
    checkRateLimit(listRes);

    if (!listRes.ok) {
        throw new Error(
            `GitHub getCommitHistory list failed: ${listRes.status} ${listRes.statusText}`
        );
    }

    const commitList: GitHubCommitListItem[] = await listRes.json() as GitHubCommitListItem[];

    const commits: Commit[] = [];

    for (const entry of commitList) {
        const detailUrl = `${GITHUB_API}/repos/${owner}/${repo}/commits/${entry.sha}`;
        const detailRes = await fetch(detailUrl, { headers: getHeaders() });
        checkRateLimit(detailRes);

        if (!detailRes.ok) {
            console.warn(`[github] Skipping commit ${entry.sha}: ${detailRes.status}`);
            continue;
        }

        const detail: GitHubCommitDetail = await detailRes.json() as GitHubCommitDetail;

        const files: CommitFile[] = (detail.files ?? []).map((f) => ({
            filename: f.filename,
            status: f.status,
        }));

        commits.push({ sha: detail.sha, files });
    }

    return commits;
}

export function computeChurnScores(commits: Commit[]): Record<string, number> {
    const churn: Record<string, number> = {};

    for (const commit of commits) {
        for (const file of commit.files) {
            churn[file.filename] = (churn[file.filename] ?? 0) + 1;
        }
    }

    return churn;
}


export async function getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    sha: string
): Promise<string> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${sha}`;
    const res = await fetch(url, { headers: getHeaders() });
    checkRateLimit(res);

    if (!res.ok) {
        throw new Error(
            `GitHub getFileContent failed: ${res.status} ${res.statusText}`
        );
    }

    const data: GitHubContentResponse = await res.json() as GitHubContentResponse;

    const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
    return decoded;
}
