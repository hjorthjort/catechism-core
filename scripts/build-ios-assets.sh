#!/bin/sh
set -eu

REPOSITORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPOSITORY_ROOT"
npm run build

DESTINATION="${TARGET_BUILD_DIR:?}/${UNLOCALIZED_RESOURCES_FOLDER_PATH:?}/WebAssets"
rm -rf "$DESTINATION"
mkdir -p "$DESTINATION"
ditto "$REPOSITORY_ROOT/dist/client" "$DESTINATION"
