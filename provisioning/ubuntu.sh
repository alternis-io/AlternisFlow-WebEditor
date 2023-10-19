# ubuntu 22.04 x86_64

set -e

# these seem to be pre-installed with digital ocean's version
sudo apt install git vim tmux
# these aren't
sudo apt install net-tools zip unzip nginx apache2-utils
# script utilities
sudo apt install trash-cli sqlite3

# conveniences
sudo apt install xclip psmisc

# let's encrypt
# https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal&tab=standard
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot certonly --nginx

# FIXME:
# clone configuration repo (this one I guess?)
# symlink versioned nginx.conf to provisioned box

sudo adduser mike
sudo usermod -aG www-data mike
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# I don't really need pnpm but it's a good nvm replacement and doesn't require root
# FIXME: these need to be added to .bashrc before the check for non-interactive shell
curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm env --global use 18
curl -fsSL https://bun.sh/install | bash

htpasswd -c /etc/nginx/.htpasswd mike
