import type { FileContext } from './types';
import { getFileTree, getFileContent } from './github';
import path from 'path';

const MAX_DEPENDENCIES = 5;
const MAX_TOTAL_FILES = 10;

export function parseImports(content: string, filePath: string): string[] {
    const dir = path.dirname(filePath);
    const imports: string[] = [];

    // ES module: import ... from '...'
    const esImportRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

    // CommonJS: require('...')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    // Python: from x import y  |  import x
    const pythonFromRegex = /^from\s+([\w.]+)\s+import/gm;
    const pythonImportRegex = /^import\s+([\w.]+)/gm;

    let match: RegExpExecArray | null;

    while ((match = esImportRegex.exec(content)) !== null) {
        const specifier = match[1];
        if (specifier.startsWith('.')) {
            imports.push(resolveRelative(dir, specifier));
        }
    }

    while ((match = requireRegex.exec(content)) !== null) {
        const specifier = match[1];
        if (specifier.startsWith('.')) {
            imports.push(resolveRelative(dir, specifier));
        }
    }

    const ext = path.extname(filePath);
    if (ext === '.py') {
        while ((match = pythonFromRegex.exec(content)) !== null) {
            const modulePath = match[1].replace(/\./g, '/');
            imports.push(modulePath + '.py');
        }
        while ((match = pythonImportRegex.exec(content)) !== null) {
            const modulePath = match[1].replace(/\./g, '/');
            imports.push(modulePath + '.py');
        }
    }

    return [...new Set(imports)];
}

function resolveRelative(dir: string, specifier: string): string {
    const resolved = path.posix.join(
        dir.replace(/\\/g, '/'),
        specifier.replace(/\\/g, '/')
    );

    // If specifier has no extension, try common ones — return as-is for matching
    if (!path.extname(specifier)) {
        return resolved; // caller can fuzzy-match against the tree
    }

    return resolved;
}

export async function assembleFileContext(
    owner: string,
    repo: string,
    sha: string,
    filePath: string
): Promise<FileContext> {
    const result: FileContext = {
        filePath,
        content: '',
        dependencies: [],
        dependents: [],
    };

    try {
        // 1. Fetch the target file content
        result.content = await getFileContent(owner, repo, filePath, sha);
    } catch {
        return result;
    }

    // 2. Parse imports to get dependency paths
    const rawDeps = parseImports(result.content, filePath);

    // 3. Fetch the file tree to validate dependency paths and find dependents
    let treePaths: string[] = [];
    try {
        const tree = await getFileTree(owner, repo, sha);
        treePaths = tree
            .filter((n) => n.type === 'blob')
            .map((n) => n.path);
    } catch {
        // If tree fetch fails, return what we have so far
        result.dependencies = rawDeps.slice(0, MAX_DEPENDENCIES);
        return result;
    }

    // 4. Resolve dependencies against the real tree
    const resolvedDeps = rawDeps
        .map((dep) => findInTree(dep, treePaths))
        .filter((d): d is string => d !== null)
        .slice(0, MAX_DEPENDENCIES);

    result.dependencies = resolvedDeps;

    // 5. Scan tree for dependents (files that import the target)
    let filesScanned = resolvedDeps.length + 1; // +1 for the target file
    const dependents: string[] = [];

    for (const tp of treePaths) {
        if (filesScanned >= MAX_TOTAL_FILES) break;
        if (tp === filePath) continue;
        if (!isCodeFile(tp)) continue;

        try {
            const srcContent = await getFileContent(owner, repo, tp, sha);
            filesScanned++;
            const srcImports = parseImports(srcContent, tp);

            const normTarget = filePath.replace(/\\/g, '/');
            const matches = srcImports.some((imp) => {
                const normImp = imp.replace(/\\/g, '/');
                return (
                    normImp === normTarget ||
                    normTarget.endsWith(normImp) ||
                    normTarget.startsWith(normImp)
                );
            });

            if (matches) {
                dependents.push(tp);
            }
        } catch {
            continue;
        }
    }

    result.dependents = dependents;
    return result;
}

function findInTree(dep: string, treePaths: string[]): string | null {
    const normalized = dep.replace(/\\/g, '/');

    // Exact match
    if (treePaths.includes(normalized)) return normalized;

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.py'];
    for (const ext of extensions) {
        const withExt = normalized + ext;
        if (treePaths.includes(withExt)) return withExt;
    }

    // Try index files
    for (const ext of extensions) {
        const indexPath = normalized + '/index' + ext;
        if (treePaths.includes(indexPath)) return indexPath;
    }

    return null;
}

function isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return [
        '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs',
        '.py', '.cjs', '.cts',
    ].includes(ext);
}
