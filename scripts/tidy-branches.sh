#!/usr/bin/env bash
# Branches already in main, which GitHub does not delete itself: those merged other than by their own
# pull request (a Records workflow's branch, merged into the branch that opened its area). Lists them;
# with --delete, deletes them. Never main, never a branch an open pull request is from, never one with
# a commit main does not have.
set -euo pipefail
delete=${1:-}
git fetch --quiet --prune origin '+refs/heads/*:refs/remotes/origin/*'
open=${OPEN_BRANCHES:-}
for branch in $(git for-each-ref --format='%(refname:strip=3)' refs/remotes/origin); do
  [ "$branch" = main ] || [ "$branch" = HEAD ] && continue
  if printf '%s\n' "$open" | grep -qxF "$branch"; then echo "keep $branch (an open pull request)"; continue; fi
  if git merge-base --is-ancestor "origin/$branch" origin/main; then
    if [ "$delete" = --delete ]; then git push --quiet origin --delete "$branch" && echo "deleted $branch"
    else echo "would delete $branch"; fi
  else
    echo "keep $branch (not all in main)"
  fi
done
