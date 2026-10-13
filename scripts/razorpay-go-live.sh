#!/usr/bin/env bash
# Switch the live site from Razorpay test mode to live mode.
#
#   ./scripts/razorpay-go-live.sh
#
# Takes no arguments: it asks for what it needs. An earlier version took the
# key id on the command line, which meant copying a usage line and editing it
# in place — and a pasted "rzp_live_<your real key id>" is read by the shell
# as a redirection from a file called "your", which is a confusing way to
# learn you mistyped something. Asking is harder to get wrong.
#
# The key secret is typed here and goes nowhere else: `read -rs` keeps it off
# the screen, it is never passed as an argument — argv is readable by every
# process on the machine via ps — and never written to a file. It reaches
# Razorpay and Netlify through a pipe into node.
#
# Before running, in the Razorpay dashboard with the mode toggle on LIVE:
#   • the account must be KYC-activated, or live keys will not authenticate
#   • Account & Settings → API Keys → Generate; the secret shows exactly once
#   • Settings → Payment Capture must be AUTOMATIC, or payment.captured never
#     fires and an order takes money without issuing a ticket
set -euo pipefail
cd "$(dirname "$0")/.."

DEFAULT_MERCHANT="PLIp5vyzYdJ31I"   # VS Studios — where the money should land

cat >&2 <<'WARN'

  ────────────────────────────────────────────────────────────────────
   This switches techxfluence.com to REAL MONEY. The ₹499 event will
   charge real cards from the moment the deploy finishes.
  ────────────────────────────────────────────────────────────────────

WARN

# ── The key id ──────────────────────────────────────────────────────────────
KEY_ID="${1:-}"
while :; do
  if [ -z "$KEY_ID" ]; then
    printf 'Razorpay LIVE key id (starts rzp_live_): ' >&2
    read -r KEY_ID
  fi
  case "$KEY_ID" in
    rzp_live_*yourkeyid*|rzp_live_YOURKEYID*|*"<"*|*">"*)
      echo "  ✖ That is the example from the instructions, not your key. Paste the real one." >&2
      KEY_ID="" ;;
    rzp_test_*)
      echo "  ✖ That is a TEST key. Live mode needs the key from the dashboard's Live toggle." >&2
      KEY_ID="" ;;
    rzp_live_?*)
      break ;;
    "")
      echo "  ✖ Nothing entered." >&2 ;;
    *)
      echo "  ✖ \"$KEY_ID\" is not a Razorpay key id. They start rzp_live_ or rzp_test_." >&2
      KEY_ID="" ;;
  esac
done

# ── The account the money must land in ──────────────────────────────────────
MERCHANT="${2:-}"
if [ -z "$MERCHANT" ]; then
  printf 'Expected merchant id [%s]: ' "$DEFAULT_MERCHANT" >&2
  read -r MERCHANT
  MERCHANT="${MERCHANT:-$DEFAULT_MERCHANT}"
fi

# ── The secret ──────────────────────────────────────────────────────────────
printf 'Razorpay LIVE key secret (not shown): ' >&2
read -rs SECRET; echo >&2
printf 'Again: ' >&2
read -rs AGAIN;  echo >&2
[ "$SECRET" = "$AGAIN" ] || { echo "  ✖ The two secrets differ. Nothing was changed." >&2; exit 1; }
[ ${#SECRET} -ge 12 ] || { echo "  ✖ That secret is implausibly short. Nothing was changed." >&2; exit 1; }

# ── Confirm ─────────────────────────────────────────────────────────────────
# Case-insensitive on purpose. The confirmation is there to make you stop and
# read, not to test your shift key; three runs were lost to typing "Live".
echo >&2
echo "  key      $KEY_ID" >&2
echo "  merchant $MERCHANT" >&2
echo "  target   https://techxfluence.com" >&2
echo >&2
printf 'Type "live" to go ahead, anything else to stop: ' >&2
read -r CONFIRM
case "$(printf '%s' "$CONFIRM" | tr '[:upper:]' '[:lower:]')" in
  live) ;;
  *) echo "  Stopped. Nothing was changed." >&2; exit 1 ;;
esac

printf '%s' "$SECRET" | node scripts/razorpay-go-live.mjs "$KEY_ID" "$MERCHANT"
