#!/usr/bin/env bash

REPO_DIR="$(dirname "$(dirname "$0")")"
REPO_NAME="$(basename "$(readlink --canonicalize "$REPO_DIR")")"
STAGING_DIR="/tmp/$REPO_NAME-staging"

echo STAGING_DIR=$STAGING_DIR

## production build
rm -rf $STAGING_DIR
# copy over built goods but not caches or dependencies
rsync -aP --exclude=.git --exclude=node_modules --exclude=.cache "$REPO_DIR" "$STAGING_DIR"
pushd $STAGING_DIR
# install prod dependencies only, we don't need the dev dependencies on the server
pnpm --production install
popd

# copy to the server
rsync -aPzv $STAGING_DIR root@alternis.io:/var/www/alternis-v1-deploy-stage

ssh root@alternis.io <<EOF
  cd /var/www/alternis-v1-deploy-stage/app/backend
  # the postinstall step that runs `prisma generate` needs to be rerun on the host, it
  # generates host-specific bindings
  # FIXME: fix install locations to not be local to mike
  /home/mike/.local/share/pnpm/pnpm exec prisma generate
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
  cp /var/www/alternis-v1-deploy-stage/provisioning/nginx.conf /etc/nginx/nginx.conf
  cp /etc/systemd/system/alternis-v1.service /etc/systemd/system/alternis-v1.service.bak
  cp /var/www/alternis-v1-deploy-stage/provisioning/alternis-v1.service /etc/systemd/system/alternis-v1.service
  # run the new code
  systemctl daemon-reload
  systemctl enable alternis-v1.service
  systemctl restart alternis-v1
  systemctl status alternis-v1
EOF
