#!/usr/bin/env bash
# =============================================================================
# veer-fresh-start.sh
# One command — wipe ALL Veer data and relaunch fresh, like a new machine.
#
# What gets wiped (from source code + disk analysis):
#   ~/.config/orca-dev/   ← dev-mode userData (pnpm dev)          [~2.5 GB]
#   ~/.config/veer/       ← packaged Veer userData                 [~7 MB]
#   ~/.config/orca/       ← legacy packaged orca userData          [~735 MB]
#   ~/.orca/agent-hooks/  ← agent hook install files
#   ~/orca/               ← Veer's internal workspace/session dir
#   ~/veer-brain/         ← legacy brain dir (if exists)
#   build out/ in repo    ← forces full clean rebuild
#
# What is NEVER touched:
#   ~/projacts/veer/      ← your source code
#   ~/projacts/.brain/    ← your agent brain
#   ~/projacts/veer/node_modules/  ← npm packages (slow to reinstall)
#
# Usage:
#   ./scripts/veer-fresh-start.sh           wipe + relaunch dev
#   ./scripts/veer-fresh-start.sh --wipe    wipe only, don't launch
#   ./scripts/veer-fresh-start.sh --dry     show what would be deleted, don't delete
# =============================================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RED='\033[0;31m'
YEL='\033[1;33m'
GRN='\033[0;32m'
BLU='\033[0;34m'
CYN='\033[0;36m'
DIM='\033[2m'
BLD='\033[1m'
RST='\033[0m'

WIPE_ONLY=false
DRY_RUN=false
for arg in "${@}"; do
  [[ "$arg" == "--wipe" ]] && WIPE_ONLY=true
  [[ "$arg" == "--dry"  ]] && DRY_RUN=true
done

# ─── helpers ─────────────────────────────────────────────────────────────────

wipe() {
  local path="$1"
  local label="$2"
  if [[ ! -e "$path" ]]; then
    echo -e "  ${DIM}skip (not found): $label${RST}"
    return
  fi
  local size
  size=$(du -sh "$path" 2>/dev/null | cut -f1)
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YEL}[DRY]${RST} would remove ${BLD}$label${RST} ${DIM}(${size})${RST}"
  else
    rm -rf "$path"
    echo -e "  ${GRN}✓${RST} removed ${BLD}$label${RST} ${DIM}(was ${size})${RST}"
  fi
}

wipe_glob() {
  local pattern="$1"
  local label="$2"
  local found=false
  for path in $pattern; do
    [[ -e "$path" ]] || continue
    found=true
    local size
    size=$(du -sh "$path" 2>/dev/null | cut -f1)
    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "  ${YEL}[DRY]${RST} would remove ${BLD}$(basename "$path")${RST} ${DIM}(${size})${RST}"
    else
      rm -rf "$path"
      echo -e "  ${GRN}✓${RST} removed ${BLD}$(basename "$path")${RST} ${DIM}(was ${size})${RST}"
    fi
  done
  [[ "$found" == "false" ]] && echo -e "  ${DIM}skip (none found): $label${RST}"
}

section() {
  echo ""
  echo -e "${CYN}── $1 ──────────────────────────────────────────${RST}"
}

# ─── banner ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLU}╔══════════════════════════════════════════════════╗${RST}"
echo -e "${BLU}║   🧹  Veer Fresh Start                           ║${RST}"
if [[ "$DRY_RUN" == "true" ]]; then
echo -e "${BLU}║   ${YEL}DRY RUN — nothing will be deleted${BLU}             ║${RST}"
fi
echo -e "${BLU}╚══════════════════════════════════════════════════╝${RST}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Kill running Veer / Electron processes
# ─────────────────────────────────────────────────────────────────────────────

section "1/6  Kill Veer processes"

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "  ${YEL}[DRY]${RST} would kill: veer dev, packaged veer, veer-ide, orcad, veer-daemon"
else
  # dev electron (pnpm dev launches from out/)
  pkill -f "projacts/veer/out" 2>/dev/null      && echo -e "  ${GRN}✓${RST} killed veer-dev electron"     || true
  # packaged installs
  pkill -f "dist/linux-unpacked/veer" 2>/dev/null && echo -e "  ${GRN}✓${RST} killed veer packaged"        || true
  pkill -f "/usr/bin/veer" 2>/dev/null            && echo -e "  ${GRN}✓${RST} killed veer system install"  || true
  pkill -f "veer-ide" 2>/dev/null                 && echo -e "  ${GRN}✓${RST} killed veer-ide"             || true
  # daemon (orcad runs as a separate process)
  pkill -f "orcad" 2>/dev/null                    && echo -e "  ${GRN}✓${RST} killed orcad daemon"         || true
  pkill -f "veer-daemon" 2>/dev/null              && echo -e "  ${GRN}✓${RST} killed veer-daemon"          || true
  sleep 1
  echo -e "  ${GRN}✓${RST} all clear"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Wipe Electron userData directories
#           Source: src/main/startup/configure-process.ts
#             dev  → ~/.config/orca-dev
#             prod → ~/.config/veer  (app.setName('Veer') → Electron default)
#             legacy orca packaged → ~/.config/orca
# ─────────────────────────────────────────────────────────────────────────────

section "2/6  Wipe Electron userData"

# Dev mode (pnpm dev) — this is the one you use most
wipe "$HOME/.config/orca-dev"  "~/.config/orca-dev  (dev userData — sessions, profiles, DBs, cache, codex-accounts)"

# Packaged Veer app
wipe "$HOME/.config/veer"      "~/.config/veer  (packaged Veer userData)"

# Legacy Orca packaged app
wipe "$HOME/.config/orca"      "~/.config/orca  (legacy orca packaged userData)"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Wipe orcad / daemon data
#           Sources:
#             ~/.orca/agent-hooks/         (src/main/agent-hooks/installer-utils.ts)
#             ~/.orca/claude-agent-teams-bin/  (src/main/runtime/claude-agent-teams-shim-env.ts)
#             ~/orca/workspaces/           (Veer's internal workspace session store)
# ─────────────────────────────────────────────────────────────────────────────

section "3/6  Wipe daemon & workspace data"

# orcad data dirs (only the ones safe to delete — not Claude managed auth)
wipe "$HOME/.orca/agent-hooks"             "~/.orca/agent-hooks  (hook install files)"
wipe "$HOME/.orca/claude-agent-teams-bin"  "~/.orca/claude-agent-teams-bin"

# Veer internal workspace/session dir
wipe "$HOME/orca"              "~/orca  (Veer workspace sessions)"

# Legacy brain dir
wipe "$HOME/veer-brain"        "~/veer-brain  (legacy)"

# Temp acceptance test dirs from old dev sessions
wipe_glob "$HOME/work/.veer-packaged-acceptance-*"  "acceptance test tmp dirs"
wipe_glob "$HOME/work/.veer-rc*-acceptance.*"        "rc acceptance tmp dirs"
wipe_glob "$HOME/work/.veer-vm-build-*"              "vm build tmp dirs"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Wipe global CLI & Veer Skills (forces onboarding to reset)
# ─────────────────────────────────────────────────────────────────────────────

section "4/6  Wipe global CLI & Veer Skills"

wipe_glob "$HOME/.local/bin/veer*" "global veer binaries"
wipe_glob "$HOME/.local/bin/orca*" "global orca binaries"
wipe "$HOME/.agents"               "~/.agents (global skills installed by Veer)"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Wipe 3rd Party AI Agent Skills (for a true 0-skill fresh start)
# ─────────────────────────────────────────────────────────────────────────────

section "5/6  Wipe 3rd Party AI Agent Skills"

# Wiping all paths Veer scans in skill-discovery-sources.ts
wipe "$HOME/.codex/skills"              "~/.codex/skills"
wipe "$HOME/.codex/plugins/cache"       "~/.codex/plugins/cache"
wipe "$HOME/.claude/skills"             "~/.claude/skills"
wipe "$HOME/.grok/skills"               "~/.grok/skills"
wipe "$HOME/.config/opencode/skills"    "~/.config/opencode/skills"
wipe "$HOME/.pi/agent/skills"           "~/.pi/agent/skills"
wipe "$HOME/.omp/agent/skills"          "~/.omp/agent/skills"
wipe "$HOME/.hermes/skills"             "~/.hermes/skills"
wipe "$HOME/.prime/agent/skills"        "~/.prime/agent/skills"
wipe "$HOME/.gemini/skills"             "~/.gemini/skills"
wipe "$HOME/.gemini/antigravity/skills" "~/.gemini/antigravity/skills"
wipe "$HOME/.cursor/skills"             "~/.cursor/skills"
wipe "$HOME/.factory/skills"            "~/.factory/skills"
wipe "$HOME/.continue/skills"           "~/.continue/skills"
wipe "$HOME/.trae-cn/skills"            "~/.trae-cn/skills"
wipe "$HOME/.augment/skills"            "~/.augment/skills"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Wipe build output (forces clean rebuild on next dev launch)
# ─────────────────────────────────────────────────────────────────────────────

section "6/6  Wipe build output"

wipe "$REPO_DIR/out"                    "out/  (electron-vite build output)"
wipe "$REPO_DIR/node_modules/.vite"     "node_modules/.vite  (vite dep cache)"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────

echo ""
if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YEL}╔══════════════════════════════════════════════════╗${RST}"
  echo -e "${YEL}║  Dry run complete — nothing was deleted          ║${RST}"
  echo -e "${YEL}║  Re-run without --dry to actually wipe           ║${RST}"
  echo -e "${YEL}╚══════════════════════════════════════════════════╝${RST}"
  echo ""
  exit 0
fi

if [[ "$WIPE_ONLY" == "true" ]]; then
  echo -e "${GRN}╔══════════════════════════════════════════════════╗${RST}"
  echo -e "${GRN}║  ✓  Wipe complete. Ready for fresh launch.       ║${RST}"
  echo -e "${GRN}╚══════════════════════════════════════════════════╝${RST}"
  echo ""
  echo -e "  Launch: ${BLU}cd $REPO_DIR && pnpm dev${RST}"
  echo ""
  exit 0
fi

echo -e "${GRN}╔══════════════════════════════════════════════════╗${RST}"
echo -e "${GRN}║  ✓  Wipe complete — launching fresh              ║${RST}"
echo -e "${GRN}╚══════════════════════════════════════════════════╝${RST}"
echo ""

cd "$REPO_DIR"
ENV_FILE="$REPO_DIR/.env.veer-platform.local"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  echo -e "  ${GRN}✓${RST} sourced ${DIM}$ENV_FILE${RST}"
else
  echo -e "  ${YEL}warn:${RST} $ENV_FILE not found — Veer sign-in will be unavailable"
fi
exec pnpm run dev
