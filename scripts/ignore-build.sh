#!/bin/bash

# Vercel Ignored Build Step
# https://vercel.com/docs/projects/overview#ignored-build-step

echo "Checking if build should be skipped..."

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Skip if commit message contains [skip ci] or [ci skip]
if [[ "$COMMIT_MSG" == *"[skip ci]"* ]] || [[ "$COMMIT_MSG" == *"[ci skip]"* ]]; then
  echo "🚫 Skipping build: commit message contains skip flag"
  exit 0
fi

# Skip if only docs/markdown files changed
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -n "$CHANGED_FILES" ]; then
  NON_DOC_FILES=$(echo "$CHANGED_FILES" | grep -v -E '\.(md|txt|json)$|^docs/|^README|^CHANGELOG|^LICENSE' || true)
  
  if [ -z "$NON_DOC_FILES" ]; then
    echo "🚫 Skipping build: only documentation files changed"
    exit 0
  fi
fi

echo "✅ Proceeding with build"
exit 1
