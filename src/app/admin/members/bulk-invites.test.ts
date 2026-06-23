import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseBulkInviteFile } from './bulk-invites'

function makeFile(name: string, workbook: XLSX.WorkBook) {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: name.endsWith('.csv') ? 'csv' : 'xlsx' })
  return new File([buffer], name)
}

describe('parseBulkInviteFile', () => {
  it('maps spreadsheet columns and rejects invalid rows', async () => {
    const sheet = XLSX.utils.json_to_sheet([
      { email: 'alice@example.com', firstname: 'Alice', surname: 'Smith' },
      { email: 'bad-email', firstname: 'Bob', surname: 'Jones' },
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Members')

    const result = await parseBulkInviteFile(makeFile('members.xlsx', workbook))

    expect(result.rows).toEqual([
      { row_number: 2, email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith' },
    ])
    expect(result.errors).toEqual([
      { row_number: 3, error: 'Valid email is required.' },
    ])
  })
})
