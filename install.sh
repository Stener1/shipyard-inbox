#!/usr/bin/env bash
# Installs the latest Inbox into ~/.berth/plugins/inbox. It stays off until you
# allow it: Settings → Plugins → Reload, then turn it on.
set -euo pipefail
dir="${BERTH_HOME:-$HOME/.berth}/plugins/inbox"
mkdir -p "$dir"
curl -fsSL https://github.com/Stener1/shipyard-inbox/releases/latest/download/shipyard-inbox.tar.gz | tar -xz -C "$dir"
echo "Installed in $dir. In Shipyard: Settings → Plugins → Reload, then turn on Inbox."
