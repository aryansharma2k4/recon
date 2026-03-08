import type { FileNode, Commit, CommitFile, TimelineEvent } from './types';

const GITHUB_API = 'https://api.github.com';
const MAX_FILE_SIZE = 500 * 1024;
const BATCH_SIZE = 5;

function getCommitLimit(): number {
    return process.env.GITHUB_TOKEN ? 30 : 5;
}

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

    if (remaining !== null && Number(remaining) <= 50) {
        const resetDate = resetEpoch
            ? new Date(Number(resetEpoch) * 1000).toISOString()
            : 'unknown';
        console.warn(
            `[github] Rate limit low: ${remaining} requests remaining. Resets at ${resetDate}`
        );
    }

    if (remaining !== null && Number(remaining) === 0 && res.status === 403) {
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
    html_url: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    author?: {
        avatar_url: string;
    };
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

export async function getDefaultBranch(
    owner: string,
    repo: string
): Promise<string> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: getHeaders() });
    checkRateLimit(res);

    if (!res.ok) {
        throw new Error(
            `GitHub getDefaultBranch failed: ${res.status} ${res.statusText}`
        );
    }

    const data = await res.json();
    return data.default_branch || 'main';
}

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

async function fetchCommitDetail(
    owner: string,
    repo: string,
    sha: string
): Promise<Commit | null> {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}`;
    const res = await fetch(url, { headers: getHeaders() });
    checkRateLimit(res);

    if (!res.ok) {
        console.warn(`[github] Skipping commit ${sha}: ${res.status}`);
        return null;
    }

    const detail: GitHubCommitDetail = await res.json() as GitHubCommitDetail;
    const files: CommitFile[] = (detail.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status,
    }));

    return { sha: detail.sha, files };
}

export async function getCommitHistory(
    owner: string,
    repo: string
): Promise<{ commits: Commit[], timeline: TimelineEvent[] }> {
    const listUrl = `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${getCommitLimit()}`;
    const listRes = await fetch(listUrl, { headers: getHeaders() });
    checkRateLimit(listRes);

    if (!listRes.ok) {
        throw new Error(
            `GitHub getCommitHistory list failed: ${listRes.status} ${listRes.statusText}`
        );
    }

    const commitList: GitHubCommitListItem[] = await listRes.json() as GitHubCommitListItem[];
    const commits: Commit[] = [];
    const timeline: TimelineEvent[] = commitList.map((item) => ({
        sha: item.sha,
        url: item.html_url,
        message: item.commit.message,
        authorName: item.commit.author.name,
        authorAvatar: item.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.commit.author.name)}&background=random`,
        date: item.commit.author.date,
    }));

    for (let i = 0; i < commitList.length; i += BATCH_SIZE) {
        const batch = commitList.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map((entry) => fetchCommitDetail(owner, repo, entry.sha))
        );
        for (const result of results) {
            if (result) commits.push(result);
        }
    }

    return { commits, timeline };
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
