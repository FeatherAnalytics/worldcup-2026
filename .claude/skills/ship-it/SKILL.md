---
name: ship-it
description: Switch to FeatherAnalytics, branch, commit (including data files), push, create PR, merge, switch back to work account.
disable-model-invocation: false
---

# Ship It

Ship current working changes to main via a feature branch and PR, handling GitHub account switching for this private repo.

## Arguments

`$ARGUMENTS` — optional branch name hint (e.g., `/ship-it housing-calculator`). If omitted, infer a short kebab-case name from the changes.

## Steps

### 1. Check GitHub account

```bash
gh auth status
```

- If active account is NOT `FeatherAnalytics`, switch:
  ```bash
  gh auth switch --user FeatherAnalytics
  ```
- **This repo requires FeatherAnalytics.** Do not proceed on any other account.

### 2. Assess changes

- Run `git status` (never use `-uall`) and `git diff --stat` to understand what changed.
- If there are no changes to commit, tell the user and stop.
- **Include changed data files** (`data/output/*.json`, `data/output/*.csv`, `web/public/data/*.json`) — these are tracked in this private repo.
- Exclude `thoughts/` unless directly relevant to the feature.

### 3. Create a feature branch

- If already on a feature branch (not `main`), ask the user if they want to use it or create a new one.
- Otherwise create:
  ```
  git checkout -b feature/<name>
  ```
- Use `$ARGUMENTS` as the name if provided, otherwise derive from the changes.

### 4. Make well-structured commits

- Group related changes into logical commits (usually 1-3).
- Each commit message should:
  - Be concise but descriptive (imperative mood, under 72 chars for subject)
  - Explain the "why" not just the "what" in the body when needed
  - End with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Always use HEREDOC format for commit messages.
- Stage files by name — never use `git add -A` or `git add .`

### 5. Push the feature branch

```bash
git push -u origin feature/<name>
```

### 6. Create a pull request

Write a high-quality PR description. Use `gh pr create` targeting `main`:

```bash
gh pr create --title "<short title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing what changed and why>

## Changes
<list of files/logical groups changed>

## Context
<brief explanation of the motivation or background>
EOF
)"
```

### 7. Merge the PR

```bash
gh pr merge <number> --merge
```

Then update local main:
```bash
git checkout main && git pull origin main
```

### 8. Switch back to work account

```bash
gh auth switch --user dhardage-apex
```

Confirm the switch:
```bash
gh auth status
```

### 9. Report back

- Show the merged PR URL
- Confirm account is back on `dhardage-apex`

## Rules

- **ALWAYS check `gh auth status` first** — wrong account = push to wrong place
- **ALWAYS switch to FeatherAnalytics before any git operations**
- **ALWAYS switch back to dhardage-apex when done**
- **ALWAYS include changed data files** — they are tracked in this private repo
- **NEVER use `git add -A` or `git add .`** — stage files by name
- **NEVER skip hooks (`--no-verify`)**
- If unsure whether a file should be included, ask the user
