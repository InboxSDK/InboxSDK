#!/bin/bash
set -euo pipefail

cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ..

# When https://github.com/npm/npm/issues/7268 is fixed, remove this if-check
# and just always call `npm install`.
if ! ./node_modules/.bin/gulp noop &>/dev/null; then
  echo "Installing dependencies..."
  rm -rf node_modules
  npm install

  if ! ./node_modules/.bin/gulp noop; then
    echo "Failed to install dependencies." >&2
    exit 11
  fi
fi

echo "Dependencies installed."
