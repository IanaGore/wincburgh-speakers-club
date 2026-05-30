'use client'

import { useEffect } from 'react'
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

export default function FaroInit() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_FARO_URL
    if (!url) return
    // Guard against double-init in React Strict Mode
    if ((window as unknown as { __faro?: unknown }).__faro) return

    initializeFaro({
      url,
      app: {
        name: process.env.NEXT_PUBLIC_FARO_APP_NAME ?? 'speakers-club-portal',
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',
      },
      instrumentations: [
        ...getWebInstrumentations(),
        new TracingInstrumentation(),
      ],
    })
  }, [])

  return null
}
