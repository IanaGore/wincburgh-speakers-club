#!/usr/bin/env bash
# Sets up GitHub labels for the Speakers Club portal project.
# Uses the gh CLI — run `gh auth login` first if not already authenticated.
# Safe to re-run: creates labels that don't exist, updates ones that do.
set -euo pipefail

REPO="IanaGore/wincburgh-speakers-club"

create_or_update_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label list --repo "$REPO" --json name --jq '.[].name' | grep -qx "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null && \
      echo "  updated: $name" || echo "  skipped: $name"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$description" && \
      echo "  created: $name"
  fi
}

echo "Setting up labels for ${REPO}..."
echo ""

# ── Workflow state ──────────────────────────────────────────────────
echo "Workflow state labels:"
create_or_update_label "idea"        "C5DEF5" "Raw idea, not yet scoped"
create_or_update_label "spec-needed" "FEF2C0" "Approved idea, needs design spec"
create_or_update_label "ready"       "0E8A16" "Has spec + plan, ready to implement"
create_or_update_label "in-progress" "1D76DB" "Currently being implemented"
create_or_update_label "blocked"     "D93F0B" "Waiting on something external"

# ── Type ────────────────────────────────────────────────────────────
echo ""
echo "Type labels:"
create_or_update_label "feature"    "7057FF" "New functionality"
create_or_update_label "bug"        "D73A4A" "Something is broken"
create_or_update_label "tech-debt"  "E99695" "Internal quality / refactor work"
create_or_update_label "docs"       "0075CA" "Documentation only"
create_or_update_label "chore"      "EDEDED" "Maintenance, deps, config"

# ── Tranche / release ───────────────────────────────────────────────
echo ""
echo "Tranche labels:"
create_or_update_label "tranche-1"  "BFD4F2" "Scheduled for Tranche 1"
create_or_update_label "tranche-2"  "BFD4F2" "Scheduled for Tranche 2"
create_or_update_label "tranche-3"  "BFD4F2" "Scheduled for Tranche 3"
create_or_update_label "backlog"    "EEEEEE" "Good idea, not yet scheduled"

# ── Keep useful defaults, remove noise ─────────────────────────────
echo ""
echo "Cleaning up default labels:"
for label in "documentation" "good first issue" "help wanted" "invalid" "question" "wontfix" "duplicate"; do
  if gh label list --repo "$REPO" --json name --jq '.[].name' | grep -qx "$label"; then
    gh label delete "$label" --repo "$REPO" --yes 2>/dev/null && echo "  deleted: $label" || echo "  skipped: $label"
  fi
done

# Keep: enhancement (rename to match our convention), bug (already correct)
create_or_update_label "enhancement" "A2EEEF" "Improvement to existing functionality"

echo ""
echo "Done! Labels are ready."
echo ""
echo "Next: create a GitHub Project at github.com/IanaGore/wincburgh-speakers-club/projects"
echo "Columns: Inbox → Scoping → Ready → In Progress → Review → Done"
echo "Add a 'Tranche' single-select field for release planning."
