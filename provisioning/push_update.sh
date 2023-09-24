#!/usr/bin/env bash

REPO_DIR="$(dirname "$(dirname "$0")")"
REPO_NAME="$(basename "$(readlink --canonicalize "$REPO_DIR")")"
STAGING_DIR="/tmp/$REPO_NAME-staging"

## production build
rm -rf $STAGING_DIR
# copy over built goods but not caches or dependencies
rsync -aP --exclude=.git --exclude=node_modules --exclude=.cache $REPO_DIR $STAGING_DIR
pushd $STAGING_DIR
# install prod dependencies only, we don't need the dev dependencies on the server
pnpm --production install
# NOTE: the postinstall step that runs `prisma generate` needs to be rerun on the host, it
# generates host-specific bindings
popd

# copy to the server
rsync -aPzv $STAGING_DIR mike@alternis.io:alternis-v1-deploy-stage
