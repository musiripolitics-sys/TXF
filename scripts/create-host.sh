#!/usr/bin/env bash
# Make somebody a host on this Techxfluence site.
#
#   ./scripts/create-host.sh you@example.com "Your Name"
#
# The password is typed here and goes nowhere else: `read -rs` keeps it off
# the screen, it is never passed as an argument (argv is readable by every
# process on the machine via ps), never written to a file, and never echoed
# back. It reaches the database through a pipe into node and no further.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -lt 2 ]; then
  echo "usage: $0 <email> \"<full name>\" [event-slug]" >&2
  exit 1
fi

printf 'Password for %s: ' "$1" >&2
read -rs PASSWORD; echo >&2
printf 'Again: ' >&2
read -rs CONFIRM;  echo >&2

if [ "$PASSWORD" != "$CONFIRM" ]; then
  echo "✖ The two passwords differ. Nothing was changed." >&2
  exit 1
fi
if [ ${#PASSWORD} -lt 8 ]; then
  echo "✖ Supabase requires at least 8 characters. Nothing was changed." >&2
  exit 1
fi

printf '%s' "$PASSWORD" | node scripts/create-host.mjs "$1" "$2" "${3:-}"
