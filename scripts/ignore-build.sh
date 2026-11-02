#!/bin/bash

# Vercel Ignored Build Step
# https://vercel.com/docs/projects/overview#ignored-build-step

echo "Checking if build should be skipped..."

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Previews: sólo main construye. Una rama construye sólo si el commit pide "[preview]".
# Costo (José, 02/11/2026): en oct-2026 hubo 162 previews de 4-5 min; Build CPU = USD 127 de 152.
if [ -n "$VERCEL_GIT_COMMIT_REF" ] && [ "$VERCEL_GIT_COMMIT_REF" != "main" ] && [[ "$COMMIT_MSG" != *"[preview]"* ]]; then
  echo "🚫 Skipping build: preview de rama $VERCEL_GIT_COMMIT_REF (agregar [preview] al commit para construirla)"
  exit 0
fi

# Skip if commit message contains [skip ci] or [ci skip]
if [[ "$COMMIT_MSG" == *"[skip ci]"* ]] || [[ "$COMMIT_MSG" == *"[ci skip]"* ]]; then
  echo "🚫 Skipping build: commit message contains skip flag"
  exit 0
fi

# Skip if only docs/markdown files changed
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -n "$CHANGED_FILES" ]; then
  # JSON files in src/lib/data/ ARE the data layer — every change must rebuild.
  # Skip when the diff is only docs (markdown, README, LICENSE, /docs/**), internal
  # reports (reports/** — the GSC CSVs the bots commit daily, not part of the site)
  # or workflow files (.github/**).
  NON_DOC_FILES=$(echo "$CHANGED_FILES" | grep -v -E '\.(md|txt)$|^docs/|^reports/|^\.github/|^README|^CHANGELOG|^LICENSE' || true)

  if [ -z "$NON_DOC_FILES" ]; then
    echo "🚫 Skipping build: only docs, reports or workflow files changed"
    exit 0
  fi
fi

echo "✅ Proceeding with build"
exit 1
