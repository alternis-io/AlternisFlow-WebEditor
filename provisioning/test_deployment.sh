# FIXME: there probably exists a way to run a full script from local path
ssh mike@alternis.io '
  cd ~/alternis-v1-deploy-stage/DialogueMiddleware-staging/app/backend \
  && pnpm exec prisma generate \
  && PORT=3000 nohup bun lib/run.js'
# FIXME: use tmux instead for test deployments
