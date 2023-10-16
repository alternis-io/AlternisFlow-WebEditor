#!/usr/bin/env bash

REPO_DIR="$(dirname "$(dirname "$0")")"
REPO_NAME="$(basename "$(readlink --canonicalize "$REPO_DIR")")"
STAGING_DIR="/tmp/alternis-v1-deploy-stage"

echo "using staging directory '$STAGING_DIR'"

## production build
rm -rf $STAGING_DIR
pnpm -r build
# copy over built goods but not caches or dependencies
# FIXME: generate excludes from .gitignore
rsync -aP --exclude=.git --exclude=node_modules \
  --exclude=external-repos/alternis-dialogue-engine/plugins \
  --exclude=.cache "$REPO_DIR" "$STAGING_DIR"
pushd $STAGING_DIR
# install prod dependencies only, we don't need the dev dependencies on the server
pnpm --production install
popd

# copy to the server
rsync -aPzv $STAGING_DIR root@alternis.io:/var/www

ssh root@alternis.io <<EOF
  # FIXME: fix install locations to not be local to mike
  export PATH="$PATH:/home/mike/.local/share/pnpm:/home/mike/.bun/bin"
  cd /var/www/alternis-v1-deploy-stage/app/backend
  # the postinstall step that runs "prisma generate" needs to be rerun on the host, it
  # generates host-specific bindings
  pnpm exec prisma generate
  # FIXME: pnpm exec prisma migrate
  trash /etc/nginx/nginx.conf
  cp /var/www/alternis-v1-deploy-stage/provisioning/nginx.conf /etc/nginx/nginx.conf
  trash /etc/systemd/system/alternis-v1.service
  cp /var/www/alternis-v1-deploy-stage/provisioning/alternis-v1.service /etc/systemd/system/alternis-v1.service
  # run the new code
  systemctl daemon-reload
  systemctl enable alternis-v1.service
  systemctl restart alternis-v1.service
  sleep 1s
  systemctl status alternis-v1.service
EOF
