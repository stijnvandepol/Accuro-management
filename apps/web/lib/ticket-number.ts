import crypto from 'crypto'

export function generateTicketNumber(date = new Date()): string {
  const year = date.getUTCFullYear()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `TCK-${year}-${random}`
}
