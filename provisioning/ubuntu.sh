# ubuntu 22.04 x86_64

# these seem to be pre-installed with digital ocean's version
sudo apt install git vim tmux
sudo apt install net-tools
sudo apt install nginx

# conveniences
sudo apt install trash-cli xclip

sudo adduser mike
ufw allow 22/tcp
ufw allow 80
ufw allow 443

# wait... should I?
curl -fsSL https://get.pnpm.io/install.sh | sh -

# do things as mike
su mike - # FIXME: untested su
pnpm env --global use 18
git clone git@github.com/MichaelBelousov/DialogueMiddleware
pushd DialogueMiddleware
# note that installing dev dependencies wastes significant disk space, would be more efficient
# to just `scp` over the pre-built stuff
pnpm install --frozen-lockfile
pnpm -r run build
(cd app/backend && pnpm run prisma:migrate)
# run on unprivileged user
(cd app/backend && PORT=3000 node lib/api.ts) &
#FIXME: copy over nginx config to this part of repo

