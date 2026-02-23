# Antarctica Trip Map

This folder now contains a frontend map app that renders `through-the-lens.geojson` with MapLibre.

## Run (WSL)

Open your WSL terminal and run:

```bash
cd /mnt/c/Users/myria/Downloads/Maps-20260223T154218Z-1-001/Maps
npm install
npm run dev -- --host
```

Then open the URL shown by Vite (usually `http://localhost:5173`).

## Build

```bash
cd /mnt/c/Users/myria/Downloads/Maps-20260223T154218Z-1-001/Maps
npm run build
```

## If `node` is not found in WSL

Your `~/.bashrc` currently calls Homebrew/asdf unconditionally. Make these lines conditional:

```bash
if command -v brew >/dev/null 2>&1; then
  export PATH="$(brew --prefix asdf)/shims:$PATH"
  . "$(brew --prefix asdf)/libexec/asdf.sh"
fi
```

After saving, restart terminal and re-check:

```bash
node -v
npm -v
```