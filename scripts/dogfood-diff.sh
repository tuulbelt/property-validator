#!/bin/bash
#
# Dogfooding: Output Diffing Utility integration
#
# This script demonstrates that property-validator produces DETERMINISTIC output:
# Run validation twice on the same data → Outputs are identical → Validation is pure
#
# Real-World Use Case:
#   Ensure validation logic is deterministic (no timestamps, UUIDs, or random data)
#   Critical for caching, testing, and reproducible builds
#
# Composability Demo:
#   TypeScript (property validator) → Rust (output diff) → Determinism verification
#
# Usage:
#   ./scripts/dogfood-diff.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(dirname "$SCRIPT_DIR")"
TEMP_DIR="/tmp/propval-diff-$$"

echo "🔬 Dogfooding: property-validator + output-diffing-utility"
echo ""
echo "Proving validation output is deterministic:"
echo "  Same input → Same output (every single time)"
echo ""

mkdir -p "$TEMP_DIR"

cd "$TOOL_DIR"

echo "📋 Running validation twice with identical input..."

# Run 1: Valid data
echo '{"name":"Alice","age":30}' | node --import tsx src/index.ts > "$TEMP_DIR/valid-out1.txt" 2>&1 || true

# Run 2: Same valid data
echo '{"name":"Alice","age":30}' | node --import tsx src/index.ts > "$TEMP_DIR/valid-out2.txt" 2>&1 || true

# Run 3: Invalid data
echo '{"name":"Bob","age":"not-a-number"}' | node --import tsx src/index.ts > "$TEMP_DIR/invalid-out1.txt" 2>&1 || true

# Run 4: Same invalid data
echo '{"name":"Bob","age":"not-a-number"}' | node --import tsx src/index.ts > "$TEMP_DIR/invalid-out2.txt" 2>&1 || true

echo "  ✓ All runs complete"
echo ""

# Compare outputs
if command -v odiff &> /dev/null; then
  echo "📊 Comparing with output-diffing-utility..."
  echo ""
  echo "Valid data (run 1 vs run 2):"
  if odiff "$TEMP_DIR/valid-out1.txt" "$TEMP_DIR/valid-out2.txt" --type text; then
    echo "  ✅ PASS: Outputs are identical!"
  else
    echo "  ❌ FAIL: Outputs differ (non-deterministic)"
    rm -rf "$TEMP_DIR"
    exit 1
  fi

  echo ""
  echo "Invalid data (run 1 vs run 2):"
  if odiff "$TEMP_DIR/invalid-out1.txt" "$TEMP_DIR/invalid-out2.txt" --type text; then
    echo "  ✅ PASS: Outputs are identical!"
  else
    echo "  ❌ FAIL: Outputs differ (non-deterministic)"
    rm -rf "$TEMP_DIR"
    exit 1
  fi
else
  echo "📊 Comparing with standard diff..."
  echo ""
  echo "Valid data (run 1 vs run 2):"
  if diff "$TEMP_DIR/valid-out1.txt" "$TEMP_DIR/valid-out2.txt"; then
    echo "  ✅ PASS: Outputs are identical!"
  else
    echo "  ❌ FAIL: Outputs differ (non-deterministic)"
    rm -rf "$TEMP_DIR"
    exit 1
  fi

  echo ""
  echo "Invalid data (run 1 vs run 2):"
  if diff "$TEMP_DIR/invalid-out1.txt" "$TEMP_DIR/invalid-out2.txt"; then
    echo "  ✅ PASS: Outputs are identical!"
  else
    echo "  ❌ FAIL: Outputs differ (non-deterministic)"
    rm -rf "$TEMP_DIR"
    exit 1
  fi
fi

rm -rf "$TEMP_DIR"

echo ""
echo "💡 Why This Matters:"
echo "   - Same validation input always produces same output"
echo "   - Safe for caching, testing, reproducible builds"
echo "   - No timestamps, UUIDs, or random data in errors"
echo ""
echo "✅ Dogfooding complete: property-validator is deterministic!"
