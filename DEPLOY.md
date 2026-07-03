# Deploy UniRaw as a portfolio site (GitHub Pages)

The app ships with a **demo mode**: when built with `VITE_DEMO=1` (or served from
`*.github.io`) it seeds a sample library and simulates the convert pipeline, so the
full studio — landing page, Overview, Media compare slider, Deliver queue, Train —
is clickable with no Python backends. A `DEMO · sample data` badge appears in the
topbar so viewers know.

## One-time setup

```bash
cd UI/uniraw_original_ui_rebuild

git init
git add .
git commit -m "UniRaw — AI-native RAW imaging platform"

# create the repo (pick any name; 'uniraw' shown here)
# with GitHub CLI:
gh repo create uniraw --public --source=. --push
# ...or create an empty repo named 'uniraw' on github.com, then:
#   git remote add origin https://github.com/<your-username>/uniraw.git
#   git branch -M main && git push -u origin main
```

Then in the repo on github.com: **Settings → Pages → Source → "GitHub Actions"**.

The included workflow (`.github/workflows/deploy.yml`) builds in demo mode with the
correct base path and publishes on every push to `main`.

Your site: `https://<your-username>.github.io/uniraw/`

## Local demo preview

```bash
VITE_DEMO=1 npm run dev     # demo mode on localhost
npm run dev                 # normal mode (real backends via ./start.sh)
```

## Notes

- Real conversions/downloads are disabled in demo mode (friendly notice instead).
- Normal local development is unaffected — demo mode only activates via the env
  flag or a github.io hostname.
- If you rename the repo, nothing changes: the workflow derives the base path
  from the repo name automatically.
