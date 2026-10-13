#!/usr/bin/env bash
# Point local development at a different Razorpay TEST account, then prove the
# new one can take a ticket.
#
#   ./scripts/razorpay-swap-test-keys.sh rzp_test_xxxxxxxxxxxx
#
# The key secret is typed here and goes nowhere else: `read -rs` keeps it off
# the screen, it is never passed as an argument, and it is written only to
# .env.local, which is gitignored. The previous .env.local is kept beside it
# with a timestamp, so the old keys are recoverable.
#
# Refuses a live key on purpose. This file is what `npm run dev` reads, and a
# live key here means a mistake on your laptop charges a real card.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "usage: $0 <rzp_test_key_id>" >&2
  exit 1
fi
KEY_ID="$1"

case "$KEY_ID" in
  rzp_test_*) ;;
  rzp_live_*) echo "✖ That is a LIVE key. .env.local drives local development, where a mistake would charge a real card. Use razorpay-go-live.sh for live keys." >&2; exit 1 ;;
  *) echo "✖ \"$KEY_ID\" is not a Razorpay key id." >&2; exit 1 ;;
esac

printf 'Razorpay TEST key secret for %s: ' "$KEY_ID" >&2
read -rs SECRET; echo >&2
printf 'Again: ' >&2
read -rs AGAIN;  echo >&2
[ "$SECRET" = "$AGAIN" ] || { echo "✖ The two secrets differ. Nothing was changed." >&2; exit 1; }
[ ${#SECRET} -ge 12 ] || { echo "✖ That secret is implausibly short. Nothing was changed." >&2; exit 1; }

# A webhook secret is only ever compared against itself locally — nothing
# signs a local delivery except this check — so a fresh random one is correct
# here and does not need to match any dashboard.
WEBHOOK_SECRET="$(openssl rand -hex 32)"

BACKUP=".env.local.$(date +%Y%m%d-%H%M%S).bak"
cp .env.local "$BACKUP"
chmod 600 "$BACKUP"
echo "  previous .env.local kept at $BACKUP" >&2

RZP_SECRET="$SECRET" python3 - "$KEY_ID" "$WEBHOOK_SECRET" <<'PY'
import os, sys, pathlib
key_id, webhook = sys.argv[1], sys.argv[2]
secret = os.environ["RZP_SECRET"]
p = pathlib.Path(".env.local")
lines, seen = [], set()
for line in p.read_text().split("\n"):
    k = line.split("=", 1)[0].strip() if "=" in line and not line.lstrip().startswith("#") else None
    new = {"RAZORPAY_KEY_ID": key_id, "RAZORPAY_KEY_SECRET": secret, "RAZORPAY_WEBHOOK_SECRET": webhook}.get(k)
    if new is not None:
        lines.append(f"{k}={new}"); seen.add(k)
    else:
        lines.append(line)
for k, v in (("RAZORPAY_KEY_ID", key_id), ("RAZORPAY_KEY_SECRET", secret), ("RAZORPAY_WEBHOOK_SECRET", webhook)):
    if k not in seen:
        lines.append(f"{k}={v}")
p.write_text("\n".join(lines))
print("  .env.local rewritten: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET")
PY

echo
echo "  Restart the dev server before the check — Next.js reads .env.local at startup."
echo "  Then: npm run check:razorpay"
