---
name: verify-site
description: "Verify codebase build, security, and report changes"
---

# Verify Site Workflow

Use this workflow to test, build, and report git status before declaring any task complete.

## Steps

1. **Check Git Status**
   Inspect modified and untracked files:
   ```bash
   git status
   ```

2. **Verify Dependencies & Security**
   Check for any high-severity dependency vulnerabilities:
   ```bash
   npm audit --audit-level=high
   ```

3. **Run Code Verification**
   Verify static types and linting:
   ```bash
   npm run lint
   ```

4. **Execute Tests**
   Run the test suite:
   ```bash
   npm test
   ```

5. **Build Application**
   Verify clean production compilation:
   ```bash
   npm run build
   ```

6. **Review Git Diff**
   Review changes to ensure blast radius compliance:
   ```bash
   git diff
   ```

