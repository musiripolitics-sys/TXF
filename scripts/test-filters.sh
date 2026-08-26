#!/bin/sh
# Bundles the filter module to plain JS, then runs its assertions on node.
set -e
mkdir -p .tmp
npx esbuild src/lib/event-filters.ts --bundle --format=esm --outfile=.tmp/event-filters.mjs --log-level=error
node src/lib/__tests__/event-filters.test.mjs
