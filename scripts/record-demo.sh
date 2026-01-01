#!/bin/bash
# Record Property Validator demo
source "$(dirname "$0")/lib/demo-framework.sh"

TOOL_NAME="property-validator"
SHORT_NAME="propval"
LANGUAGE="typescript"

demo_setup() {
  mkdir -p "$TOOL_DIR/demo-files"

  # Create valid user data
  cat > "$TOOL_DIR/demo-files/valid-user.json" <<'EOF'
{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com"
}
EOF

  # Create invalid user data (age is string, should be number)
  cat > "$TOOL_DIR/demo-files/invalid-user.json" <<'EOF'
{
  "name": "Bob",
  "age": "thirty",
  "email": "bob@example.com"
}
EOF
}

demo_cleanup() {
  rm -rf "$TOOL_DIR/demo-files"
}

demo_commands() {
  echo "# Property Validator Demo"
  sleep 1

  echo ""
  echo "# 1. Install globally for easy access"
  sleep 0.5
  echo "$ npm link"
  sleep 1

  echo ""
  echo "# 2. Validate valid user data"
  sleep 0.5
  echo "$ cat demo-files/valid-user.json"
  cat demo-files/valid-user.json
  sleep 1
  echo ""
  echo "$ propval < demo-files/valid-user.json"
  sleep 0.5
  propval < demo-files/valid-user.json
  sleep 2

  echo ""
  echo "# 3. Validate invalid data (clear error message)"
  sleep 0.5
  echo "$ cat demo-files/invalid-user.json"
  cat demo-files/invalid-user.json
  sleep 1
  echo ""
  echo "$ propval < demo-files/invalid-user.json"
  sleep 0.5
  propval < demo-files/invalid-user.json || true
  sleep 2

  echo ""
  echo "# 4. Validate API response data"
  sleep 0.5
  echo '$ echo '"'"'{"name":"Charlie","age":25,"email":"charlie@example.com"}'"'"' | propval'
  sleep 0.5
  echo '{"name":"Charlie","age":25,"email":"charlie@example.com"}' | propval
  sleep 2

  echo ""
  echo "# Runtime type validation for JavaScript/TypeScript"
  sleep 1
}

run_demo
