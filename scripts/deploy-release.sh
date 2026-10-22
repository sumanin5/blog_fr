#!/usr/bin/env bash
# Deploy the exact configuration uploaded alongside a commit's images.
set -Eeuo pipefail

if [[ $# -ne 2 || $1 != /* || ! $2 =~ ^[0-9a-f]{40}$ ]]; then
    echo 'Usage: deploy-release.sh /absolute/project/path <40-character commit SHA>' >&2
    exit 2
fi

project_dir=$1
export IMAGE_TAG=$2
release_dir="$project_dir/.deploy/$IMAGE_TAG"
compose_file="$release_dir/docker-compose.yml"
phase=preflight
trap 'echo "Release $IMAGE_TAG failed during $phase; deployment stopped." >&2' ERR

[[ -f "$project_dir/.env" && -f "$compose_file" ]]
# Media must exist before app startup; the backend mounts it during import.
mkdir -p "$project_dir/backend/media" "$project_dir/backend/data"

compose() {
    docker compose --project-name blog_fr --project-directory "$project_dir" \
        --env-file "$project_dir/.env" -f "$compose_file" "$@"
}

# Avoid printing the resolved configuration, which includes secrets.
compose config --quiet
phase=pull
compose pull
phase=database-start
compose up -d --wait --wait-timeout 90 db
phase=migration
# Run migrations in the NEW image before replacing the application containers.
compose run --rm --no-deps backend alembic upgrade head

phase=application-start
# Keep the previous desired release for explicit operator rollback.
if [[ -f "$project_dir/.release.env" ]]; then
    cp -f "$project_dir/.release.env" "$project_dir/.previous-release.env"
fi
if [[ -f "$project_dir/docker-compose.yml" ]]; then
    cp -f "$project_dir/docker-compose.yml" "$project_dir/.previous-compose.yml"
fi
cp -f "$compose_file" "$project_dir/docker-compose.yml"
printf 'IMAGE_TAG=%s\n' "$IMAGE_TAG" > "$project_dir/.release.env"
compose up -d --wait --wait-timeout 180

phase=smoke-check
# This probe checks Next.js -> backend -> database through the frontend route.
compose exec -T frontend node -e "fetch('http://127.0.0.1:3000/api/health', {signal: AbortSignal.timeout(5000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

echo "Release $IMAGE_TAG deployed and healthy."
