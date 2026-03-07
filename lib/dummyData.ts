import { FileNode, CommitNode } from './types'

// Realistic dummy file tree for a React project
export const dummyTreeData: FileNode[] = [
    // Root files
    { path: 'package.json', type: 'blob', size: 1200, sha: 'a1b2c3', churnScore: 8 },
    { path: 'tsconfig.json', type: 'blob', size: 450, sha: 'b2c3d4', churnScore: 2 },
    { path: 'README.md', type: 'blob', size: 3200, sha: 'c3d4e5', churnScore: 5 },
    { path: '.gitignore', type: 'blob', size: 200, sha: 'd4e5f6', churnScore: 1 },
    { path: 'next.config.ts', type: 'blob', size: 380, sha: 'e5f6a7', churnScore: 3 },

    // src/components
    { path: 'src/components/Header.tsx', type: 'blob', size: 2800, sha: 'f6a7b8', churnScore: 12 },
    { path: 'src/components/Footer.tsx', type: 'blob', size: 1500, sha: 'a7b8c9', churnScore: 4 },
    { path: 'src/components/Sidebar.tsx', type: 'blob', size: 3200, sha: 'b8c9d0', churnScore: 15 },
    { path: 'src/components/Modal.tsx', type: 'blob', size: 2100, sha: 'c9d0e1', churnScore: 9 },
    { path: 'src/components/Button.tsx', type: 'blob', size: 850, sha: 'd0e1f2', churnScore: 6 },
    { path: 'src/components/Card.tsx', type: 'blob', size: 1100, sha: 'e1f2a3', churnScore: 3 },
    { path: 'src/components/Avatar.tsx', type: 'blob', size: 600, sha: 'f2a3b4', churnScore: 2 },
    { path: 'src/components/Tooltip.tsx', type: 'blob', size: 900, sha: 'a3b4c5', churnScore: 7 },

    // src/hooks
    { path: 'src/hooks/useAuth.ts', type: 'blob', size: 1800, sha: 'b4c5d6', churnScore: 18 },
    { path: 'src/hooks/useTheme.ts', type: 'blob', size: 600, sha: 'c5d6e7', churnScore: 4 },
    { path: 'src/hooks/useDebounce.ts', type: 'blob', size: 350, sha: 'd6e7f8', churnScore: 1 },
    { path: 'src/hooks/useLocalStorage.ts', type: 'blob', size: 500, sha: 'e7f8a9', churnScore: 3 },

    // src/lib
    { path: 'src/lib/api.ts', type: 'blob', size: 4200, sha: 'f8a9b0', churnScore: 22 },
    { path: 'src/lib/utils.ts', type: 'blob', size: 1200, sha: 'a9b0c1', churnScore: 10 },
    { path: 'src/lib/constants.ts', type: 'blob', size: 800, sha: 'b0c1d2', churnScore: 5 },
    { path: 'src/lib/validators.ts', type: 'blob', size: 1500, sha: 'c1d2e3', churnScore: 8 },

    // src/pages
    { path: 'src/pages/index.tsx', type: 'blob', size: 3500, sha: 'd2e3f4', churnScore: 20 },
    { path: 'src/pages/dashboard.tsx', type: 'blob', size: 5200, sha: 'e3f4a5', churnScore: 25 },
    { path: 'src/pages/settings.tsx', type: 'blob', size: 4100, sha: 'f4a5b6', churnScore: 14 },
    { path: 'src/pages/profile.tsx', type: 'blob', size: 2800, sha: 'a5b6c7', churnScore: 7 },
    { path: 'src/pages/login.tsx', type: 'blob', size: 2200, sha: 'b6c7d8', churnScore: 11 },

    // src/styles
    { path: 'src/styles/globals.css', type: 'blob', size: 2400, sha: 'c7d8e9', churnScore: 13 },
    { path: 'src/styles/components.css', type: 'blob', size: 1800, sha: 'd8e9f0', churnScore: 6 },

    // src/types
    { path: 'src/types/api.ts', type: 'blob', size: 900, sha: 'e9f0a1', churnScore: 8 },
    { path: 'src/types/user.ts', type: 'blob', size: 500, sha: 'f0a1b2', churnScore: 4 },
    { path: 'src/types/config.ts', type: 'blob', size: 350, sha: 'a1b2c3', churnScore: 2 },

    // tests
    { path: 'tests/components/Header.test.tsx', type: 'blob', size: 1200, sha: 'b2c3d4', churnScore: 6 },
    { path: 'tests/components/Sidebar.test.tsx', type: 'blob', size: 1500, sha: 'c3d4e5', churnScore: 8 },
    { path: 'tests/hooks/useAuth.test.ts', type: 'blob', size: 2000, sha: 'd4e5f6', churnScore: 12 },
    { path: 'tests/lib/api.test.ts', type: 'blob', size: 2500, sha: 'e5f6a7', churnScore: 15 },
    { path: 'tests/lib/utils.test.ts', type: 'blob', size: 800, sha: 'f6a7b8', churnScore: 3 },

    // config
    { path: 'config/database.ts', type: 'blob', size: 700, sha: 'a7b8c9', churnScore: 5 },
    { path: 'config/redis.ts', type: 'blob', size: 400, sha: 'b8c9d0', churnScore: 2 },
    { path: 'config/auth.ts', type: 'blob', size: 1100, sha: 'c9d0e1', churnScore: 9 },
]

// Dummy commit timeline data
export const dummyCommitTimeline: CommitNode[] = [
    {
        sha: 'a1f3e8c',
        message: 'feat: add dashboard analytics page',
        author: 'sarah.chen',
        date: '2025-03-01',
        filesChanged: 12,
        additions: 340,
        deletions: 45,
        type: 'commit',
    },
    {
        sha: 'b2d4f9a',
        message: 'fix: resolve auth token refresh loop',
        author: 'alex.kumar',
        date: '2025-03-02',
        filesChanged: 3,
        additions: 28,
        deletions: 15,
        type: 'commit',
    },
    {
        sha: 'c3e5a0b',
        message: 'Merge PR #142: Sidebar redesign',
        author: 'sarah.chen',
        date: '2025-03-03',
        filesChanged: 8,
        additions: 520,
        deletions: 380,
        type: 'merge',
    },
    {
        sha: 'd4f6b1c',
        message: 'refactor: extract validation utils',
        author: 'mike.johnson',
        date: '2025-03-04',
        filesChanged: 6,
        additions: 180,
        deletions: 210,
        type: 'commit',
    },
    {
        sha: 'e5a7c2d',
        message: 'feat: add dark mode toggle',
        author: 'alex.kumar',
        date: '2025-03-05',
        filesChanged: 5,
        additions: 95,
        deletions: 12,
        type: 'commit',
    },
    {
        sha: 'f6b8d3e',
        message: 'Merge PR #148: API rate limiting',
        author: 'mike.johnson',
        date: '2025-03-06',
        filesChanged: 4,
        additions: 210,
        deletions: 30,
        type: 'merge',
    },
    {
        sha: 'a7c9e4f',
        message: 'fix: modal overflow on mobile',
        author: 'sarah.chen',
        date: '2025-03-07',
        filesChanged: 2,
        additions: 18,
        deletions: 8,
        type: 'commit',
    },
    {
        sha: 'b8d0f5a',
        message: 'chore: update dependencies',
        author: 'alex.kumar',
        date: '2025-03-08',
        filesChanged: 2,
        additions: 150,
        deletions: 120,
        type: 'commit',
    },
    {
        sha: 'c9e1a6b',
        message: 'feat: real-time notifications system',
        author: 'mike.johnson',
        date: '2025-03-09',
        filesChanged: 9,
        additions: 420,
        deletions: 35,
        type: 'commit',
    },
    {
        sha: 'd0f2b7c',
        message: 'Merge PR #155: Settings page overhaul',
        author: 'sarah.chen',
        date: '2025-03-10',
        filesChanged: 7,
        additions: 380,
        deletions: 290,
        type: 'merge',
    },
    {
        sha: 'e1a3c8d',
        message: 'test: add e2e tests for auth flow',
        author: 'alex.kumar',
        date: '2025-03-11',
        filesChanged: 4,
        additions: 280,
        deletions: 0,
        type: 'commit',
    },
    {
        sha: 'f2b4d9e',
        message: 'perf: optimize image loading pipeline',
        author: 'mike.johnson',
        date: '2025-03-12',
        filesChanged: 3,
        additions: 65,
        deletions: 42,
        type: 'commit',
    },
]

// Stats for the landing page
export const dummyStats = {
    totalFiles: 38,
    totalFolders: 9,
    topChurnFiles: [
        { path: 'src/pages/dashboard.tsx', churnScore: 25 },
        { path: 'src/lib/api.ts', churnScore: 22 },
        { path: 'src/pages/index.tsx', churnScore: 20 },
        { path: 'src/hooks/useAuth.ts', churnScore: 18 },
        { path: 'src/components/Sidebar.tsx', churnScore: 15 },
    ],
}
