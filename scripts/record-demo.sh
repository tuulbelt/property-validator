#!/bin/bash
# Record Property Validator demo
source "$(dirname "$0")/lib/demo-framework.sh"

TOOL_NAME="property-validator"
SHORT_NAME="propval"
LANGUAGE="typescript"

demo_setup() {
  mkdir -p "$TOOL_DIR/demo-files"

  # Create sample schema
  cat > "$TOOL_DIR/demo-files/user-schema.json" <<'EOF'
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number" },
    "email": { "type": "string" }
  }
}
EOF

  # Create valid data
  cat > "$TOOL_DIR/demo-files/valid-user.json" <<'EOF'
{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com"
}
EOF

  # Create invalid data
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
  echo "# 1. Validate valid user data"
  sleep 0.5
  echo "$ propval --schema demo-files/user-schema.json --data demo-files/valid-user.json"
  sleep 0.5
  propval --schema demo-files/user-schema.json --data demo-files/valid-user.json
  sleep 2

  echo ""
  echo "# 2. Validate invalid data (shows clear error message)"
  sleep 0.5
  echo "$ propval --schema demo-files/user-schema.json --data demo-files/invalid-user.json"
  sleep 0.5
  propval --schema demo-files/user-schema.json --data demo-files/invalid-user.json || true
  sleep 2

  echo ""
  echo "# 3. Verbose mode (detailed error information)"
  sleep 0.5
  echo "$ propval --schema demo-files/user-schema.json --data demo-files/invalid-user.json --verbose"
  sleep 0.5
  propval --schema demo-files/user-schema.json --data demo-files/invalid-user.json --verbose || true
  sleep 2

  echo ""
  echo "# 4. JSON output mode"
  sleep 0.5
  echo "$ propval --schema demo-files/user-schema.json --data demo-files/valid-user.json --json"
  sleep 0.5
  propval --schema demo-files/user-schema.json --data demo-files/valid-user.json --json
  sleep 2

  echo ""
  echo "# Done! Validate runtime data with the propval command."
  sleep 1
}

run_demo
