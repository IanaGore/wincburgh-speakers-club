import * as XLSX from 'xlsx'

export type BulkInviteInput = {
  row_number: number
  email: string
  first_name: string
  last_name: string | null
}

export type BulkInviteParseResult = {
  rows: BulkInviteInput[]
  errors: { row_number: number; error: string }[]
}

export type BulkInviteBatchRow = {
  id: string
  email: string
  first_name: string
  last_name: string | null
  status: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function headerKey(value: unknown): string {
  return clean(value).toLowerCase().replace(/[\s_-]+/g, '')
}

export async function parseBulkInviteFile(file: File): Promise<BulkInviteParseResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const parsedRows: BulkInviteInput[] = []
  const errors: BulkInviteParseResult['errors'] = []

  rows.forEach((row, index) => {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [headerKey(key), clean(value)])
    )

    const email = clean(normalized.email).toLowerCase()
    const firstName = clean(normalized.firstname)
    const lastName = clean(normalized.surname) || null
    const row_number = index + 2

    if (!email || !EMAIL_RE.test(email)) {
      errors.push({ row_number, error: 'Valid email is required.' })
      return
    }

    if (!firstName) {
      errors.push({ row_number, error: 'First name is required.' })
      return
    }

    parsedRows.push({ row_number, email, first_name: firstName, last_name: lastName })
  })

  return { rows: parsedRows, errors }
}

export function queueBulkInviteProcessor(batchId: string, cookie: string | null) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) return
  void fetch(new URL('/api/admin/bulk-invites/process', siteUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ batch_id: batchId }),
  }).catch(() => {})
}
