#!/bin/bash
set -euo pipefail

DIR="/Users/koafujimoto/Downloads/Game163"
LOG="$DIR/predictions.log"
PYTHON="$(which python3)"

echo "========================================" >> "$LOG"
echo "Run: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
echo "========================================" >> "$LOG"

output=$("$PYTHON" "$DIR/predict_today.py" 2>&1)
exit_code=$?

echo "$output" >> "$LOG"
echo "" >> "$LOG"

if [ $exit_code -ne 0 ]; then
    echo "predict_today.py exited with code $exit_code" | "$PYTHON" "$DIR/send_summary.py"
    exit $exit_code
fi

echo "$output" | "$PYTHON" "$DIR/send_summary.py"
