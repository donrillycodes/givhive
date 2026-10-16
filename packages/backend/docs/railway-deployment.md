# Railway deployment and migrations

The production backend is connected to `donrillycodes/givhive`, branch `main`,
with `/packages/backend` as its root directory. Automatic deployments should
start when commits are pushed to that branch.

## Automatic migrations

Railway runs `npm run build` to compile the backend, then `npm run start`.
The start script runs `prisma migrate deploy && node dist/server.js`:

- Prisma applies pending migrations from `prisma/migrations` to the configured database.
- The server starts only after migrations succeed. A migration failure stops startup.
- Already applied migrations are not rerun.
- Restoring billing or restarting an old deployment does not fetch new migrations
  from GitHub. The deployment must contain the new commits first.

Check **Deploy Logs** for the applied migration names and successful completion.
Do not use `prisma migrate reset` or `prisma db push` on the production database.

## If GitHub pushes are not appearing

1. Compare the active deployment's commit with GitHub's `main` branch.
2. Check that automatic deploys are enabled, the branch is `main`, and watch paths
   or **Wait for CI** are not excluding the push.
3. If Railway cannot load branches, check its GitHub connection and the Railway
   GitHub App's existing repository access. Branch loading errors alone do not
   establish that repository permissions are missing.
4. Select the backend service, open the command palette with **Cmd/Ctrl+K**, and
   choose **Deploy latest commit**. The deployment menu's **Redeploy** action
   rebuilds the old deployment's source instead.
5. Verify **Build Logs**, **Deploy Logs**, and the active deployment's commit.
   Confirm a subsequent push triggers a deployment without a manual action.

References: [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys)
and [deployment actions](https://docs.railway.com/deployments/deployment-actions).
