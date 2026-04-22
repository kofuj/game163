#!/usr/bin/env bash
# sync_results.sh
# Run after each day's predictions to push the latest CSVs into the backend
# so Railway serves real data after the next deploy.
#
# Usage:
#   ./sync_results.sh          # copy only
#   ./sync_results.sh --commit # copy + git add + commit
#   ./sync_results.sh --push   # copy + git add + commit + push

set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
SRC="$REPO/results"
DEST="$REPO/backend/data"

mkdir -p "$DEST/daily"

cp "$SRC/season_summary.csv"    "$DEST/season_summary.csv"    && echo "✓ season_summary.csv"
cp "$SRC/record.csv"            "$DEST/record.csv"            && echo "✓ record.csv"
cp "$SRC/daily/"predictions_*.csv     "$DEST/daily/"          && echo "✓ display CSVs"
cp "$SRC/daily/"predictions_raw_*.csv "$DEST/daily/" 2>/dev/null && echo "✓ raw CSVs" || true

echo ""
echo "Backend data synced to $DEST"

if [[ "${1:-}" == "--commit" || "${1:-}" == "--push" ]]; then
  cd "$REPO"
  git add backend/data/
  git commit -m "chore: sync prediction data $(date +%Y-%m-%d)"
  echo "✓ Committed"
fi

if [[ "${1:-}" == "--push" ]]; then
  git push
  echo "✓ Pushed — Railway will redeploy automatically"
fi
