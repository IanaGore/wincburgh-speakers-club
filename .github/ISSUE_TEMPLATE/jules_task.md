---
name: Jules Task
about: Task template for autonomous agent and developer work
title: "[Task]: "
labels: ["ready-for-agent"]
assignees: []
---

## Objective
<!-- Clear summary of the goal, feature, or bugfix to accomplish. -->

## Target Files
<!-- List the exact files or directories expected to be modified or created. -->
- `path/to/file`

## Acceptance Criteria
<!-- Bulleted list of conditions that must be satisfied for task completion. -->
- [ ] Criterion 1
- [ ] Criterion 2

## Security Guardrails
<!-- Security constraints relevant to this task (OWASP Top 10, sanitization, secrets). -->
- [ ] No inline unsanitized user inputs or unsafe HTML injections.
- [ ] No external script tags.
- [ ] Zero committed secrets, API keys, or `.env` files.
- [ ] Row Level Security (RLS) properly respected and checked.

## Verification
<!-- Verification steps required to declare the task complete. -->
- [ ] `npm run lint` passes without syntax or type errors.
- [ ] `npm audit --audit-level=high` reports zero high/critical vulnerabilities.
- [ ] `npm run build` completes cleanly.
- [ ] Blast radius respected: only target files touched.

