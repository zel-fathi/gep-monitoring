#!/usr/bin/env bash
set -euo pipefail

# --- config ---
GITHUB_USER="zel-fathi"
REPO_NAME="gep-monitoring"             # e.g. green-energy-park-app
REMOTE_SSH="git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
# ---------------

# 0) init repo
git init
git branch -M main

# (optional) set your identity if not already set
git config user.name  "zakaria el fathi"
git config user.email "zackeshtheng@gmail.com"

# 1) .gitignore + base docs (Sat Aug 16)
cat > .gitignore <<'EOF'
# Node / Vite
node_modules/
.vite/
dist/
*.log

# Env
.env
.env.*

# Frontend build
frontend/dist/

# Editors / OS
.vscode/
.idea/
.DS_Store
Thumbs.db
EOF

git add .gitignore README.md AGENTS.md components.json index.html \
        package.json pnpm-lock.yaml tailwind.config.ts postcss.config.js \
        tsconfig.json vite.config.ts vite.config.server.ts netlify netlify.toml || true
GIT_AUTHOR_DATE="2025-08-16 11:00:00 +0100" \
GIT_COMMITTER_DATE="2025-08-16 11:00:00 +0100" \
git commit -m "chore: bootstrap repo, tooling & docs"

# 2) infra: docker + nginx + start script (Sun Aug 17)
git add docker-compose.yml nginx start.sh || true
GIT_AUTHOR_DATE="2025-08-17 14:05:00 +0100" \
GIT_COMMITTER_DATE="2025-08-17 14:05:00 +0100" \
git commit -m "infra: compose, nginx config, start.sh workflow"

# 3) db init + sample data (Mon Aug 18)
git add db data || true
GIT_AUTHOR_DATE="2025-08-18 10:30:00 +0100" \
GIT_COMMITTER_DATE="2025-08-18 10:30:00 +0100" \
git commit -m "db: initialization scripts and sample dataset"

# 4) backend core (Tue Aug 19)
git add backend || true
GIT_AUTHOR_DATE="2025-08-19 16:45:00 +0100" \
GIT_COMMITTER_DATE="2025-08-19 16:45:00 +0100" \
git commit -m "backend: express server, routes and utilities"

# 5) shared/server/public (Wed Aug 20)
git add server shared public || true
GIT_AUTHOR_DATE="2025-08-20 18:20:00 +0100" \
GIT_COMMITTER_DATE="2025-08-20 18:20:00 +0100" \
git commit -m "chore: add shared helpers, server utilities and public assets"

# 6) frontend scaffold (Thu Aug 21)
git add frontend || true
GIT_AUTHOR_DATE="2025-08-21 12:30:00 +0100" \
GIT_COMMITTER_DATE="2025-08-21 12:30:00 +0100" \
git commit -m "frontend: React/Vite scaffold, pages, components and styles"

# 7) API docs (Fri Aug 22)
git add backend/openapi.yaml backend/src/server.js || true
GIT_AUTHOR_DATE="2025-08-22 09:50:00 +0100" \
GIT_COMMITTER_DATE="2025-08-22 09:50:00 +0100" \
git commit -m "docs(api): add OpenAPI spec and Swagger UI endpoint"

# 8) UI polish (Sat Aug 23)
git add frontend/src/components/Pagination.tsx \
        frontend/src/components/DailyConsumptionChart.tsx \
        frontend/src/components/Navbar.tsx \
        frontend/src/pages/Dashboard.tsx \
        frontend/src/pages/UserManagement.tsx \
        frontend/src/pages/Actions.tsx \
        frontend/src/styles.css || true
GIT_AUTHOR_DATE="2025-08-23 17:40:00 +0100" \
GIT_COMMITTER_DATE="2025-08-23 17:40:00 +0100" \
git commit -m "ui: modern datatable design, pagination, navbar gradient, extra chart"

# 9) final touches (Sun Aug 24)
git add docker-compose.yml start.sh README.md || true
GIT_AUTHOR_DATE="2025-08-24 11:15:00 +0100" \
GIT_COMMITTER_DATE="2025-08-24 11:15:00 +0100" \
git commit -m "release: root port on nginx, start.sh npm install step, updated README"

# Create repo on GitHub (choose one)
# A) If using GitHub CLI and want to auto-create + push:
# gh repo create "${REPO_NAME}" --private --source . --remote origin --push

# B) Manual remote:
git remote add origin "${REMOTE_SSH}"
git push -u origin main

echo "✅ Done. Check your history:"
git log --oneline --decorate --graph --date=local --pretty='format:%C(yellow)%h%Creset %Cgreen%ad%Creset %C(cyan)(%an)%Creset %C(bold blue)%d%Creset %s' --all
