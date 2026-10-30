---
trigger: always_on
description: "Mandatory verification and security rules for all changes"
---

- Enforce that every patch must compile clean with `npm run build`.
- Any dependency added must pass `npm audit`.
- Never commit API keys, tokens, or `.env` files.

