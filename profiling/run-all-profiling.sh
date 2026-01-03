#!/bin/bash
# Run all profiling scripts and generate reports

set -e

cd "$(dirname "$0")/.."

echo "🔬 Running comprehensive profiling analysis..."
echo ""

# Clean up old profiling data
rm -f isolate-*.log profiling/*.txt

echo "1️⃣  Profiling Object Arrays (worst case: 4.2x slower than valibot)..."
node --prof profiling/profile-object-arrays.js
if [ -f isolate-*-v8.log ]; then
  node --prof-process isolate-*-v8.log > profiling/object-arrays-profile.txt
  rm isolate-*-v8.log
  echo "   ✓ Report: profiling/object-arrays-profile.txt"
fi

echo ""
echo "2️⃣  Profiling Primitive Arrays (2.9x slower than valibot)..."
node --prof profiling/profile-primitive-arrays.js
if [ -f isolate-*-v8.log ]; then
  node --prof-process isolate-*-v8.log > profiling/primitive-arrays-profile.txt
  rm isolate-*-v8.log
  echo "   ✓ Report: profiling/primitive-arrays-profile.txt"
fi

echo ""
echo "3️⃣  Profiling Simple Objects (1.8x slower than valibot)..."
node --prof profiling/profile-objects.js
if [ -f isolate-*-v8.log ]; then
  node --prof-process isolate-*-v8.log > profiling/objects-profile.txt
  rm isolate-*-v8.log
  echo "   ✓ Report: profiling/objects-profile.txt"
fi

echo ""
echo "4️⃣  Profiling Primitives (1.9x slower than valibot)..."
node --prof profiling/profile-primitives.js
if [ -f isolate-*-v8.log ]; then
  node --prof-process isolate-*-v8.log > profiling/primitives-profile.txt
  rm isolate-*-v8.log
  echo "   ✓ Report: profiling/primitives-profile.txt"
fi

echo ""
echo "✅ All profiling complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Review reports in profiling/*.txt"
echo "   2. Look for functions taking >5% of total ticks"
echo "   3. Identify hotspots: WeakSet operations, path building, validation loops"
echo "   4. Compare Normal API vs Fast API overhead"
echo ""
echo "💡 Quick analysis:"
echo "   grep -A 5 'Summary' profiling/*.txt"
echo "   grep 'validateWithPath\\|WeakSet\\|compileObjectValidator' profiling/*.txt"
