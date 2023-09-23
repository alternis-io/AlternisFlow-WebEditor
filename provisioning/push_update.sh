# production build
git clone .. temp
pushd temp
pnpm --production i
# copy over static site?

pnpm -w build

# FIXME: tar.gz it locally and extract on the other side?
# copy to staging directory
scp ../prod-build mike@alternis.io:alternis
# env vars?
ssh mike@alternis.io -c 'cd alternis && pnpm exec prisma migrate'
# test in staging directory?
