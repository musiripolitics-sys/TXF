#!/usr/bin/env bash
# Switch the live site from Razorpay test mode to live mode.
#
#   ./scripts/razorpay-go-live.sh rzp_live_xxxxxxxxxxxx
#
# The key secret is typed here and goes nowhere else: `read -rs` keeps it off
# the screen, it is never passed as an argument, never written to a file, and
# never echoed back. It reaches Razorpay and Netlify through a pipe into node.
#
# Before running, in the Razorpay dashboard with the mode toggle on LIVE:
#   • the account must be KYC-activated, or live keys will not authenticate
#   • Account & Settings → API Keys → Generate; the secret shows exactly once
#   • Settings → Payment Capture must be AUTOMATIC, or payment.captured never
#     fires and an order takes money without issuing a ticket
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "usage: $0 <rzp_live_key_id> [expected_merchant_id]" >&2
  echo "       the second argument is checked before anything is changed, so" >&2
  echo "       keys from the wrong Razorpay account stop the run" >&2
  exit 1
fi

cat >&2 <<'WARN'

  This switches techxfluence.com to real money. The ₹499 event will charge
  real cards from the moment the deploy finishes.

WARN
printf 'Type LIVE to continue: ' >&2
read -r CONFIRM
[ "$CONFIRM" = "LIVE" ] || { echo "Nothing was changed." >&2; exit 1; }

printf 'Razorpay live key SECRET: ' >&2
read -rs SECRET; echo >&2
printf 'Again: ' >&2
read -rs CONFIRM2; echo >&2

if [ "$SECRET" != "$CONFIRM2" ]; then
  echo "✖ The two secrets differ. Nothing was changed." >&2
  exit 1
fi

printf '%s' "$SECRET" | node scripts/razorpay-go-live.mjs "$1" "${2:-}"
