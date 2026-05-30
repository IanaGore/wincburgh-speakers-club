import type { Faro } from '@grafana/faro-web-sdk'

export function getFaro(): Faro | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { __faro?: Faro }).__faro
}
