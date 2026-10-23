# Issue tracker: GitHub

Specs and tickets for this repo live as GitHub issues in `gerrcass/faja-heavy-crude-sim`. Use the `gh` CLI.

## Conventions

- **Create**: `gh issue create --title "..." --body-file <file>`; add `--parent <n>` for a sub-issue.
- **Read**: `gh issue view <n> --json number,title,body,labels,comments,subIssues,issueDependenciesSummary`.
- **List open**: `gh issue list --state open --json number,title,body,labels --jq '[.[] | {number,title,labels:[.labels[].name]}]'`.
- **Label**: `gh issue edit <n> --add-label "ready-for-agent"`.
- **Blocking edge**: `gh issue edit <child> --add-blocked-by <blocker>` (native dependency; the UI shows it). A ticket is ready when every blocker is closed.
- **Sub-issue**: `gh issue create --parent <spec> ...`, or `gh issue edit <spec> --add-sub-issue <child>`.
- **Close**: close by merging the PR (`Closes #n` in the body) or `gh issue close <n> --comment "..."`.
- **PRs as a request surface**: no.

## When a skill says "publish to the issue tracker"

Create a GitHub issue. The spec is the parent issue; tickets are its sub-issues.

## Frontier query

```sh
gh issue list --state open --json number,title,labels,issueDependenciesSummary \
  --jq '.[] | select(.labels | map(.name) | index("ready-for-agent")) | select(.issueDependenciesSummary.blocked_by == 0) | .number'
```

Claim a ticket with `gh issue edit <n> --add-assignee @me` before starting it.
