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
TEMP_DIR="/tmp/propval-diff-demo-$$"

echo "🔬 Dogfooding: Output Diffing Utility + Property Validator"
echo ""
echo "This demonstrates that validation output is DETERMINISTIC:"
echo "  Validate same data twice → Capture outputs → Diff them → Verify identical"
echo ""

# Create temp dir
mkdir -p "$TEMP_DIR"

# Create test data
cat > "$TEMP_DIR/test-schema.json" << 'EOF'
{
  "type": "object",
  "properties": {
    "name": "string",
    "age": "number",
    "email": "string"
  }
}
EOF

cat > "$TEMP_DIR/valid-data.json" << 'EOF'
{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com"
}
EOF

cat > "$TEMP_DIR/invalid-data.json" << 'EOF'
{
  "name": "Bob",
  "age": "thirty",
  "email": "bob@example.com"
}
EOF

echo "📋 Test data created:"
echo "  - valid-data.json (should pass validation)"
echo "  - invalid-data.json (should fail with error)"
echo ""

cd "$TOOL_DIR"

echo "🔄 Running validation twice to capture outputs..."
echo ""

# Run 1: Valid data
echo "  [Run 1/4] Validating valid data (attempt 1)..."
node --import tsx src/index.ts --schema "$TEMP_DIR/test-schema.json" --data "$TEMP_DIR/valid-data.json" > "$TEMP_DIR/valid-run1.txt" 2>&1 || true

echo "  [Run 2/4] Validating valid data (attempt 2)..."
node --import tsx src/index.ts --schema "$TEMP_DIR/test-schema.json" --data "$TEMP_DIR/valid-data.json" > "$TEMP_DIR/valid-run2.txt" 2>&1 || true

# Run 2: Invalid data
echo "  [Run 3/4] Validating invalid data (attempt 1)..."
node --import tsx src/index.ts --schema "$TEMP_DIR/test-schema.json" --data "$TEMP_DIR/invalid-data.json" > "$TEMP_DIR/invalid-run1.txt" 2>&1 || true

echo "  [Run 4/4] Validating invalid data (attempt 2)..."
node --import tsx src/index.ts --schema "$TEMP_DIR/test-schema.json" --data "$TEMP_DIR/invalid-data.json" > "$TEMP_DIR/invalid-run2.txt" 2>&1 || true

echo "  ✓ All runs complete"
echo ""

# Check if output-diffing-utility is available
if command -v odiff &> /dev/null; then
  echo "📊 Comparing outputs with Output Diffing Utility..."
  echo "---"

  echo "Comparing valid data outputs:"
  if odiff "$TEMP_DIR/valid-run1.txt" "$TEMP_DIR/valid-run2.txt" --type text; then
    echo "✅ Valid data outputs are IDENTICAL!"
  else
    echo "⚠️  Valid data outputs differ (unexpected!)"
  fi

  echo ""
  echo "Comparing invalid data outputs:"
  if odiff "$TEMP_DIR/invalid-run1.txt" "$TEMP_DIR/invalid-run2.txt" --type text; then
    echo "✅ Invalid data outputs are IDENTICAL!"
  else
    echo "⚠️  Invalid data outputs differ (unexpected!)"
  fi

else
  echo "📊 Comparing outputs with standard diff..."
  echo "---"

  echo "Comparing valid data outputs:"
  if diff "$TEMP_DIR/valid-run1.txt" "$TEMP_DIR/valid-run2.txt"; then
    echo "✅ Valid data outputs are IDENTICAL!"
  else
    echo "⚠️  Valid data outputs differ (unexpected!)"
  fi

  echo ""
  echo "Comparing invalid data outputs:"
  if diff "$TEMP_DIR/invalid-run1.txt" "$TEMP_DIR/invalid-run2.txt"; then
    echo "✅ Invalid data outputs are IDENTICAL!"
  else
    echo "⚠️  Invalid data outputs differ (unexpected!)"
  fi
fi

echo "---"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo "✨ Composition Demo Complete!"
echo ""
echo "💡 Key Takeaways:"
echo "   - Property Validator produces deterministic output"
echo "   - Same input → Same output (every time)"
echo "   - Safe for caching, testing, and reproducible builds"
echo "   - Output Diffing Utility verifies determinism"
echo ""
echo "🔗 See DOGFOODING_STRATEGY.md for implementation details"
