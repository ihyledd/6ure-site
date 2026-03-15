# Deploy notes – push, deploy, and VPS build

Quick reference for your Mac → GitHub → VPS flow.

---

## 1. Push (Mac → GitHub)

From your Mac, in the project folder:

```bash
cd /Users/ihyledd/6ure-site

# Stage changes
git add .

# Commit (use a short message)
git commit -m "Describe what you changed"

# Push to GitHub
git push
```

If your branch isn’t set to track `origin/main` yet:

```bash
git push -u origin main
```

---

## 2. Deploy (Mac → VPS: pull + build + restart)

Still on your Mac, after you’ve pushed:

```bash
cd /Users/ihyledd/6ure-site
npm run deploy:vps
```

When prompted, enter the **root password for your VPS**.

This will:

- SSH into the VPS
- `git pull origin main` in the project directory
- Run `build-and-restart.sh` (build + restart the app)

**Required env on your Mac (once per terminal or in your profile):**

```bash
export DEPLOY_VPS_HOST="root@173.249.56.89"
export DEPLOY_VPS_DIR="/var/www/html/new complete site"
```

---

## 3. Pull and build on the VPS (manual)

Only if you need to do it by hand on the server (e.g. deploy script didn’t run, or you’re debugging):

```bash
# From your Mac: log into the VPS
ssh root@173.249.56.89

# On the VPS: go to project and pull
cd "/var/www/html/new complete site"
git pull origin main

# Build and restart (same as deploy script)
bash build-and-restart.sh

# Leave the VPS when done
exit
```

---

## 4. Finding the Turbopack error (when build retries)

If you see **"Turbopack build failed, retrying with default bundler..."**, the script now **prints the full Turbopack error** above that line. Scroll up in the deploy output to see what failed.

- The Turbopack log is also saved on the VPS as **`.build.turbopack.log`** in the project dir. After deploy, you can SSH in and run: `cat .build.turbopack.log`.
- To run only the Turbopack build (no retry) and see the error: on the VPS run `npm run build -- --turbopack` (no log redirect).

---

## Summary

| Step   | Where   | Command              |
|--------|--------|----------------------|
| Push   | Mac    | `git add . && git commit -m "..." && git push` |
| Deploy | Mac    | `npm run deploy:vps` (then enter VPS root password) |
| Pull + build on VPS | VPS (SSH) | `cd "/var/www/html/new complete site" && git pull origin main && bash build-and-restart.sh` |
