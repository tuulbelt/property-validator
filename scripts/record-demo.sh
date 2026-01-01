#!/bin/bash
# Record demo for {{TOOL_NAME}}
# Copy this template to scripts/record-{{TOOL_NAME}}-demo.sh in the meta repo
# and customize the demo_commands function.
#
# Usage: bash scripts/record-{{TOOL_NAME}}-demo.sh
# Prerequisites: asciinema, agg (for GIF conversion)

source "$(dirname "$0")/lib/demo-framework.sh"

TOOL_NAME="{{TOOL_NAME}}"
SHORT_NAME="{{SHORT_NAME}}"
LANGUAGE="typescript"

# Optional: Custom GIF parameters (defaults: 80x24, monokai theme, 1.0 speed, 16pt font)
# GIF_COLS=80
# GIF_ROWS=24
# GIF_SPEED=1.0
# GIF_FONT_SIZE=16
# GIF_THEME=monokai

# Optional: Setup function (creates test data, temp files, etc.)
# demo_setup() {
#   mkdir -p "$TOOL_DIR/demo-files"
#   echo '{"key": "value"}' > "$TOOL_DIR/demo-files/config.json"
# }

# Optional: Cleanup function (removes temp files created in setup)
# demo_cleanup() {
#   rm -rf "$TOOL_DIR/demo-files"
# }

# Required: Demo commands to record
demo_commands() {
  echo "# {{TOOL_NAME}} Demo"
  sleep 1

  echo ""
  echo "# Basic usage"
  sleep 0.5
  echo "$ {{SHORT_NAME}} --help"
  sleep 0.5
  {{SHORT_NAME}} --help
  sleep 2

  # Add more demo steps here...
  # Example:
  # echo ""
  # echo "# Create something"
  # sleep 0.5
  # echo "$ {{SHORT_NAME}} create --name example"
  # sleep 0.5
  # {{SHORT_NAME}} create --name example
  # sleep 1.5

  echo ""
  echo "# Done! Use the {{SHORT_NAME}} command."
  sleep 1
}

run_demo
