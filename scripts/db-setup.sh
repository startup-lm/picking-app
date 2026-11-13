#!/usr/bin/env bash
set -euo pipefail

REF=""
SEED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      if [[ -n "${2:-}" ]]; then
        REF="$2"
        shift 2
      else
        echo "Error: --project-ref requires a project reference value" >&2
        echo "Usage: $0 --project-ref <ref> [--seed]" >&2
        exit 1
      fi
      ;;
    --seed)
      SEED=true
      shift
      ;;
    *)
      echo "Usage: $0 --project-ref <ref> [--seed]" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$REF" ]]; then
  echo "Usage: $0 --project-ref <ref> [--seed]" >&2
  exit 1
fi

supabase link --project-ref "$REF"

if [[ "$SEED" = true ]]; then
  supabase db push --include-seed
else
  supabase db push
fi

echo "Next step: npm run db:create-admin -- --email <email>"
