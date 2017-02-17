#!/bin/bash
set -euo pipefail

cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ..

if ! ./node_modules/.bin/gulp noop &>/dev/null; then
  echo "Installing dependencies..."
  npm install

  if ! ./node_modules/.bin/gulp noop; then
    echo "Failed to install dependencies." >&2
    echo "Make sure your npm version ($(npm -v)) is up to date." >&2
    exit 11
  fi
fi

echo "Dependencies installed."
