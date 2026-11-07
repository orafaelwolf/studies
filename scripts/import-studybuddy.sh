#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -e package.json || -e app || -e lib ]]; then
  echo "Projeto já inicializado. Abortando para não sobrescrever código."
  exit 1
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone --depth 1 https://github.com/DagaVedant/StudyBuddy.git "$TMP/upstream"
echo "Upstream commit: $(git -C "$TMP/upstream" rev-parse HEAD)"
mkdir -p docs
cp "$TMP/upstream/README.md" docs/UPSTREAM_STUDYBUDDY_README.md
tar -C "$TMP/upstream" --exclude='./.git' --exclude='./README.md' -cf - . | tar -C "$ROOT" -xf -
echo "Código-base importado. Verifique LICENSE, versões, migrações e segurança antes de rodar ou fazer deploy."
