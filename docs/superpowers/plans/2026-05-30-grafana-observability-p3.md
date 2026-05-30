# OpenTelemetry Server Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side distributed tracing to the Speakers Club Next.js portal via a single `instrumentation.ts` file, sending traces to Grafana Cloud over OTLP.

**Architecture:** Next.js 16's stable `instrumentation.ts` hook calls `register()` on server start. The OTel NodeSDK is initialised with auto-instrumentations (HTTP, fetch, DNS — filesystem disabled) and an OTLP HTTP exporter. All config comes from environment variables — no hardcoded values. Dynamic imports ensure Node.js-only modules never reach the Edge runtime.

**Tech Stack:** `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, Next.js 16 App Router

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/instrumentation.ts` |
| Modify | `package.json` (via npm install) |
| Modify | `.env.local` (add 3 env vars) |

---

### Task 1: Install OTel packages

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the three OTel packages**

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

Expected: all three packages appear in `package.json` dependencies. No peer dependency warnings should block the install.

- [ ] **Step 2: Verify TypeScript can resolve the packages**

```bash
npx tsc --noEmit 2>&1 | grep opentelemetry | head -10
```

Expected: no output (no OTel-related type errors).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install OpenTelemetry packages for server tracing"
```

---

### Task 2: Create `instrumentation.ts` and add env vars

**Files:**
- Create: `src/instrumentation.ts`
- Modify: `.env.local`

- [ ] **Step 1: Add env vars to `.env.local`**

Add these three lines to `.env.local`. The real values come from Grafana Cloud → Connections → Add new connection → OpenTelemetry — the setup page shows the endpoint URL and the pre-formatted `Authorization=Basic ...` header string.

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-eu-west-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(instanceId:apiToken)>
OTEL_SERVICE_NAME=speakers-club-portal
```

For local dev, you may leave `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` as placeholders — the SDK will fail silently to export if the endpoint is unreachable, and the app will still run. Only `OTEL_SERVICE_NAME` is needed locally.

- [ ] **Step 2: Create `src/instrumentation.ts`**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  })

  sdk.start()
}
```

Notes for the implementer:
- `OTLPTraceExporter()` with no arguments reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` from the environment automatically — do not pass them as constructor arguments.
- `NodeSDK` reads `OTEL_SERVICE_NAME` from the environment automatically.
- All imports must be dynamic (`await import(...)`) — static imports would bundle Node.js modules into the Edge runtime and cause build errors.
- `@opentelemetry/instrumentation-fs` is disabled because Next.js triggers thousands of filesystem spans during module resolution, making traces unreadable.
- Do NOT modify `next.config.ts` — `instrumentationHook` was an experimental flag for pre-Next.js 15 and must not be added to Next.js 16.

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev 2>&1 | head -30
```

Expected: server starts on port 3000 with no OTel-related errors. You may see a connection warning if the OTLP endpoint placeholder is unreachable — that is expected and harmless.

- [ ] **Step 5: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat: add OTel auto-instrumentation for server-side tracing"
```

---

### Task 3: Add env vars to Vercel

**Files:** Vercel dashboard (no code changes)

- [ ] **Step 1: Add the three env vars to Vercel**

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value | Environments |
|------|-------|--------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-eu-west-0.grafana.net/otlp` (get exact URL from Grafana Cloud → Connections → OpenTelemetry) | Production, Preview |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic <your-base64-credentials>` (copy from Grafana Cloud setup page) | Production, Preview |
| `OTEL_SERVICE_NAME` | `speakers-club-portal` | Production, Preview, Development |

Do **not** add `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_HEADERS` to the Development environment — you don't want local dev builds sending traces to Grafana Cloud.

- [ ] **Step 2: Trigger a production deploy**

Push any change or manually trigger a redeploy in the Vercel dashboard.

- [ ] **Step 3: Verify traces appear in Grafana Cloud**

Within 2–3 minutes of the deployment going live, open:

Grafana Cloud → Explore → select your Tempo datasource → run a trace search for service name `speakers-club-portal`

You should see spans for incoming HTTP requests and outgoing Supabase fetch calls. If no traces appear after 5 minutes, check:
1. Vercel → Deployment → Function logs for OTel connection errors
2. That `OTEL_EXPORTER_OTLP_HEADERS` value was copied correctly (the `=` after `Authorization` is part of the value, not a separator)
