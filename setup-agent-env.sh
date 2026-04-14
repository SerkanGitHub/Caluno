#!/usr/bin/env bash

set -euo pipefail

# Shared references directory (configurable via env var or first argument)
REFS_DIR="${AGENT_REFS_DIR:-${1:-$HOME/dev/references}}"
LOCAL_DIR="references"
MAX_JOBS=4

REPOS=(
  "git@github.com:svecosystem/runed.git"
  "git@github.com:sveltejs/svelte.git"
  "git@github.com:sveltejs/kit.git"
  "git@github.com:colinhacks/zod.git"
  "git@github.com:svecosystem/mode-watcher.git"
  "git@github.com:huntabyte/shadcn-svelte.git"
  "git@github.com:tailwindlabs/tailwindcss.git"
  "git@github.com:ionic-team/capacitor.git"
  "git@github.com:ionic-team/capacitor-plugins.git"
  "git@github.com:ionic-team/capacitor-haptics.git"
  "git@github.com:Cap-go/capacitor-native-audio.git"
  "git@github.com:opral/paraglide-js.git"
  "git@github.com:fastlane/fastlane.git"
  "git@github.com:kamranahmedse/driver.js.git"
  "git@github.com:Cap-go/capacitor-fast-sql.git"
  "git@gitlab.com:project-everything/yahtzee.git"
  "git@github.com:clauderic/dnd-kit.git"
  "git@github.com:Cap-go/capacitor-updater.git"
)

echo "Shared references directory: $REFS_DIR"

mkdir -p "$REFS_DIR"
mkdir -p "$LOCAL_DIR"

# Step 1: Clone/update repos in the shared directory
printf "%s\n" "${REPOS[@]}" | xargs -P "$MAX_JOBS" -n 1 bash -c '
  repo="$1"
  refs_dir="'"$REFS_DIR"'"

  name="$(basename "$repo" .git)"
  dir="$refs_dir/$name"

  if [ -d "$dir/.git" ]; then
    echo "Updating $name"
    git -C "$dir" pull --ff-only
  else
    echo "Cloning $name"
    git clone "$repo" "$dir"
  fi
' _

# Step 2: Create symlinks from local references/ to shared directory
for repo in "${REPOS[@]}"; do
  name="$(basename "$repo" .git)"
  link="$LOCAL_DIR/$name"
  target="$REFS_DIR/$name"

  if [ -L "$link" ]; then
    current="$(readlink "$link")"
    if [ "$current" != "$target" ]; then
      rm "$link"
      ln -s "$target" "$link"
      echo "Updated symlink: $link -> $target"
    fi
  elif [ -d "$link" ]; then
    echo "Replacing local clone with symlink: $link -> $target"
    rm -rf "$link"
    ln -s "$target" "$link"
  else
    ln -s "$target" "$link"
    echo "Created symlink: $link -> $target"
  fi
done

echo "Done. All references are symlinked from $LOCAL_DIR/ to $REFS_DIR/"