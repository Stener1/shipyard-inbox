#!/usr/bin/env bash
# Refreshes vendor/plugin-sdk from Shipyard at a tag. The types only; the app
# provides the SDK at runtime.
set -euo pipefail
tag=${1:-v0.3.31}
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://codeload.github.com/cosscom/shipyard/tar.gz/refs/tags/$tag" | tar -xz -C "$tmp" --strip-components=1
rm -rf "$root/vendor/plugin-sdk/src"
cp -r "$tmp/packages/plugin-sdk/src" "$tmp/packages/plugin-sdk/package.json" "$root/vendor/plugin-sdk/"
cp "$tmp/LICENSE" "$root/vendor/plugin-sdk/LICENSE"
echo "vendor/plugin-sdk is at $tag. Update the tag's default in this script."
