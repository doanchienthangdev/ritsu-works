// GitHub REST API helper for the drift-fix-proposer skill.
//
// Why this exists: Edge Functions are Deno + npm, no `gh` CLI / shell. To
// open a PR from a Supabase Edge Function we use the REST API directly via
// fetch + a PAT (GITHUB_CONSISTENCY_BOT_TOKEN — scoped to contents:write +
// pull_requests:write per governance/SECRETS.md).
//
// Designed for testability: every method takes a `fetch` function via deps
// injection. Tests pass a fake; production passes globalThis.fetch.
//
// Coverage in v1.1:
//   - getDefaultBranchSha
//   - createBranch (from base ref)
//   - createCommit (one or more file changes on the branch)
//   - openPullRequest (with draft flag)
//   - getPullRequest (for state polling)
// Not covered yet: merging, closing, requesting reviewers — v1.2/later.

export interface GitHubClientDeps {
  owner: string;                          // e.g., "doanchienthangdev"
  repo: string;                           // e.g., "ritsu-works"
  token: string;                          // GITHUB_CONSISTENCY_BOT_TOKEN value
  fetchImpl?: typeof fetch;               // override for tests
}

export interface FileChange {
  path: string;                           // path within repo, no leading slash
  content: string;                        // full new content of the file
  // OR for delete:
  delete?: boolean;
}

export interface OpenPrInput {
  branchName: string;                     // new branch to create
  baseBranch?: string;                    // default "main"
  commitMessage: string;
  prTitle: string;
  prBody: string;
  draft?: boolean;                        // true → draft PR (default true for safety)
  files: FileChange[];
}

export interface OpenPrResult {
  pr_url: string;                         // html URL on github.com
  pr_number: number;
  head_sha: string;
  branch: string;
}

export interface PrStatus {
  number: number;
  state: "open" | "closed";
  merged: boolean;
  merged_at: string | null;
  html_url: string;
}

const API_BASE = "https://api.github.com";

function buildClient(deps: GitHubClientDeps) {
  const f = deps.fetchImpl ?? globalThis.fetch;
  const headers = {
    "Authorization": `Bearer ${deps.token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ritsu-works-consistency-engine",
  };
  return { f, headers };
}

async function gh<T>(
  deps: GitHubClientDeps,
  method: string,
  pathStr: string,
  body?: unknown,
): Promise<T> {
  const { f, headers } = buildClient(deps);
  const init: RequestInit = {
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const url = `${API_BASE}${pathStr}`;
  const res = await f(url, init);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`github ${method} ${pathStr} → ${res.status}: ${errText.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getDefaultBranchSha(deps: GitHubClientDeps): Promise<{ branch: string; sha: string }> {
  const repo = await gh<{ default_branch: string }>(
    deps, "GET", `/repos/${deps.owner}/${deps.repo}`,
  );
  const branch = repo.default_branch;
  const ref = await gh<{ object: { sha: string } }>(
    deps, "GET", `/repos/${deps.owner}/${deps.repo}/git/refs/heads/${branch}`,
  );
  return { branch, sha: ref.object.sha };
}

export async function createBranch(
  deps: GitHubClientDeps,
  branchName: string,
  fromSha: string,
): Promise<void> {
  await gh(deps, "POST", `/repos/${deps.owner}/${deps.repo}/git/refs`, {
    ref: `refs/heads/${branchName}`,
    sha: fromSha,
  });
}

interface BlobResp { sha: string; }
interface TreeResp { sha: string; }
interface CommitResp { sha: string; }
interface RefResp { object: { sha: string } }

// Commits a batch of file changes onto an existing branch. Uses git data
// objects API (blob → tree → commit → update ref) instead of the higher-level
// "create/update file" endpoint so multiple files become one commit.
export async function createCommitOnBranch(
  deps: GitHubClientDeps,
  branchName: string,
  files: FileChange[],
  message: string,
): Promise<{ commit_sha: string }> {
  // 1. Get current ref + commit + tree.
  const ref = await gh<RefResp>(
    deps, "GET", `/repos/${deps.owner}/${deps.repo}/git/refs/heads/${branchName}`,
  );
  const parentCommitSha = ref.object.sha;
  const parentCommit = await gh<{ tree: { sha: string } }>(
    deps, "GET", `/repos/${deps.owner}/${deps.repo}/git/commits/${parentCommitSha}`,
  );
  const baseTreeSha = parentCommit.tree.sha;

  // 2. Build tree entries from file changes.
  const treeEntries = [] as Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha?: string | null;
    content?: string;
  }>;
  for (const file of files) {
    if (file.delete) {
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    // Create blob first (uploading content); then reference its sha.
    const blob = await gh<BlobResp>(
      deps, "POST", `/repos/${deps.owner}/${deps.repo}/git/blobs`,
      { content: file.content, encoding: "utf-8" },
    );
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  // 3. Create tree on top of base.
  const tree = await gh<TreeResp>(
    deps, "POST", `/repos/${deps.owner}/${deps.repo}/git/trees`,
    { base_tree: baseTreeSha, tree: treeEntries },
  );

  // 4. Create commit.
  const commit = await gh<CommitResp>(
    deps, "POST", `/repos/${deps.owner}/${deps.repo}/git/commits`,
    { message, tree: tree.sha, parents: [parentCommitSha] },
  );

  // 5. Update branch ref.
  await gh(deps, "PATCH", `/repos/${deps.owner}/${deps.repo}/git/refs/heads/${branchName}`, {
    sha: commit.sha,
    force: false,
  });

  return { commit_sha: commit.sha };
}

export async function openPullRequest(
  deps: GitHubClientDeps,
  input: { head: string; base: string; title: string; body: string; draft?: boolean },
): Promise<{ html_url: string; number: number }> {
  const r = await gh<{ html_url: string; number: number }>(
    deps, "POST", `/repos/${deps.owner}/${deps.repo}/pulls`,
    {
      head: input.head,
      base: input.base,
      title: input.title,
      body: input.body,
      draft: input.draft ?? true,
    },
  );
  return r;
}

export async function getPullRequest(
  deps: GitHubClientDeps,
  prNumber: number,
): Promise<PrStatus> {
  return await gh<PrStatus>(
    deps, "GET", `/repos/${deps.owner}/${deps.repo}/pulls/${prNumber}`,
  );
}

// Top-level convenience: open a PR with a batch of file changes in one call.
// Used by drift-fix-proposer.
export async function openFixPr(
  deps: GitHubClientDeps,
  input: OpenPrInput,
): Promise<OpenPrResult> {
  const base = input.baseBranch ?? "main";

  // 1. Get current base sha.
  const baseInfo = await getDefaultBranchSha(deps);
  // Use input.baseBranch if explicitly set, else default.
  const baseSha = input.baseBranch ? await (async () => {
    const ref = await gh<RefResp>(
      deps, "GET", `/repos/${deps.owner}/${deps.repo}/git/refs/heads/${input.baseBranch}`,
    );
    return ref.object.sha;
  })() : baseInfo.sha;

  // 2. Create branch.
  await createBranch(deps, input.branchName, baseSha);

  // 3. Commit files.
  const { commit_sha } = await createCommitOnBranch(
    deps, input.branchName, input.files, input.commitMessage,
  );

  // 4. Open PR.
  const pr = await openPullRequest(deps, {
    head: input.branchName,
    base,
    title: input.prTitle,
    body: input.prBody,
    draft: input.draft ?? true,
  });

  return {
    pr_url: pr.html_url,
    pr_number: pr.number,
    head_sha: commit_sha,
    branch: input.branchName,
  };
}
