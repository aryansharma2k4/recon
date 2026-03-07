
export type FileNode = {
  path: string;
  type: 'blob' | 'tree';
  size: number;
  sha: string;
  churnScore: number;
};


export type CommitFile = {
  filename: string;
  status: string;
};

export type Commit = {
  sha: string;
  files: CommitFile[];
};


export type TreeResponse = {
  tree: FileNode[];
  totalFiles: number;
  totalFolders: number;
  churnMap: Record<string, number>;
};

export type FileContext = {
  filePath: string;
  content: string;
  dependencies: string[];
  dependents: string[];
};
