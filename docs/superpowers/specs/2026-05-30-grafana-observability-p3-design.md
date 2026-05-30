# Grafana Cloud Observability — Sub-project 3 Design (OpenTelemetry Server Tracing)

> **For agentic workers:** This spec is implemented via `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Read the linked implementation plan for task-by-task instructions.

**Goal:** Add server-side distributed tracing to the Speakers Club Next.js portal using OpenTelemetry auto-instrumentation, sending traces to Grafana Cloud via OTLP. Zero per-file instrumentation code — a single `instrumentation.ts` covers all server actions, API routes, and Supabase fetch calls automatically.

**Architecture:** Next.js 16's stable `instrumentation.ts` hook exports a `register()` function that initialises the OTel `NodeSDK` on server start. All config is read from environment variables (standard OTel convention). The SDK is guarded behind a `NEXT_RUNTIME === 'nodejs'` check so it never runs on the Edge runtime.

**Tech Stack:** `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, Next.js 16 App Router

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/instrumentation.ts` | OTel SDK init — called once by Next.js on server start |

No other files need to change. `next.config.ts` does **not** need `instrumentationHook: true` — that flag was experimental pre-Next.js 15 and is no longer required.

---

## Implementation

### `src/instrumentation.ts`

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
        '@opentelemetry/instrumentation-fs': { enabled: false }, // filesystem spans are too noisy
      }),
    ],
  })

  sdk.start()
}
```

All imports are dynamic (`await import(...)`) — required to avoid bundling Node.js-only modules into the Edge runtime.

`OTLPTraceExporter` reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` automatically from environment — no constructor arguments needed.

`NodeSDK` reads `OTEL_SERVICE_NAME` automatically from environment.

---

## Environment Variables

Server-side only — do **not** prefix with `NEXT_PUBLIC_`.

| Variable | Example value | Purpose |
|----------|--------------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://otlp-gateway-prod-eu-west-0.grafana.net/otlp` | Grafana Cloud OTLP gateway URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Basic <base64(instanceId:apiToken)>` | Auth header for the OTLP endpoint |
| `OTEL_SERVICE_NAME` | `speakers-club-portal` | Service name shown in Grafana traces |

**Where to get the values:**
1. Grafana Cloud → left sidebar → **Connections** → **Add new connection**
2. Search for **OpenTelemetry**
3. The setup page shows your endpoint URL and a pre-formatted `Authorization=Basic ...` header string — copy both directly

Add to `.env.local` for local development and to Vercel → Settings → Environment Variables for production (Production + Preview environments only — not Development, since you don't want local dev sending traces to Grafana Cloud).

---

## What Gets Traced Automatically

No per-file changes needed. `getNodeAutoInstrumentations()` enables:

| Signal | What it captures |
|--------|----------------|
| HTTP/fetch calls | Every Supabase REST and Auth API call — URL, method, status, duration |
| Incoming requests | Every Next.js server action invocation and API route — duration, error status |
| DNS | DNS resolution timing (low-level, useful for cold-start diagnosis) |
| Filesystem | **Disabled** — too noisy in Next.js (constant module resolution reads) |

Each trace includes the service name, environment, and spans for the full call chain: incoming request → server action → Supabase fetch → response.

---

## Packages

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```

---

## Out of Scope

- Custom span attributes on individual server actions (can be added later via `@opentelemetry/api` if needed)
- Metrics export (traces only — Grafana Cloud derives RED metrics from traces automatically)
- Log correlation (OTel logs — future sub-project if needed)
- Edge runtime instrumentation (not supported by NodeSDK; Edge routes are excluded by the `NEXT_RUNTIME` guard)
