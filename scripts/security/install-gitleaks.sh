#!/usr/bin/env bash
set -euo pipefail

# Official v8.30.1 Linux x64 release; checksum reviewed against upstream manifest.
# No floating installer or executable from a PR-supplied download URL.
tools_dir="$(mktemp -d)"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz' \
  --output "$tools_dir/gitleaks.tar.gz"
printf '%s  %s\n' '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' "$tools_dir/gitleaks.tar.gz" | sha256sum --check --strict
tar -xzf "$tools_dir/gitleaks.tar.gz" -C "$tools_dir" gitleaks
"$tools_dir/gitleaks" version
printf '%s\n' "$tools_dir" >> "$GITHUB_PATH"
