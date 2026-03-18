export function isTicketDevelopmentFeaturesEnabled(): boolean {
  return process.env.ENABLE_TICKET_DEVELOPMENT_FEATURES === 'true'
}
