import { useToast } from 'primevue/usetoast'

// Map backend error messages to Dutch user-friendly messages
const ERROR_TRANSLATIONS: Record<string, string> = {
  // Auth
  'Invalid email or password': 'Onjuist e-mailadres of wachtwoord',
  'Invalid or expired token': 'Je sessie is verlopen, log opnieuw in',
  'Invalid token payload': 'Ongeldige sessie, log opnieuw in',
  'User not found or inactive': 'Gebruiker niet gevonden of gedeactiveerd',
  'Token reuse detected': 'Beveiligingsprobleem gedetecteerd — log opnieuw in',
  'Current password is incorrect': 'Huidig wachtwoord is onjuist',
  'Password verification failed': 'Wachtwoord onjuist',

  // Permissions
  'Insufficient permissions': 'Je hebt geen rechten voor deze actie',
  'Admin access required': 'Alleen beheerders hebben toegang',
  'Invalid API key': 'Ongeldige API-sleutel',
  'External API not configured': 'Externe API is niet geconfigureerd',

  // Clients
  'Client not found': 'Klant niet gevonden',
  'Client with this email or company name already exists': 'Er bestaat al een klant met dit e-mailadres of deze bedrijfsnaam',
  'Cannot delete client with active projects': 'Kan klant niet verwijderen — er zijn nog actieve projecten gekoppeld',

  // Projects
  'Project not found': 'Project niet gevonden',
  'Could not generate unique slug': 'Kon geen unieke URL genereren — probeer een andere projectnaam',

  // Invoices
  'Invoice not found': 'Factuur niet gevonden',
  'Business settings not configured': 'Vul eerst de bedrijfsinstellingen in (Instellingen → Bedrijfsgegevens)',

  // Users
  'User not found': 'Gebruiker niet gevonden',
  'Email already registered': 'Dit e-mailadres is al in gebruik',
  'Cannot delete yourself': 'Je kunt jezelf niet verwijderen',

  // Change Requests
  'Change request not found': 'Wijzigingsverzoek niet gevonden',

  // Notes & Communication
  'Communication entry not found': 'Communicatie-item niet gevonden',
  'Can only delete your own entries': 'Je kunt alleen je eigen items verwijderen',
  'Note not found': 'Notitie niet gevonden',
  'Can only delete your own notes': 'Je kunt alleen je eigen notities verwijderen',

  // Proposals
  'Proposal not found': 'Offerte niet gevonden',

  // Repositories & Links
  'Repository not found': 'Repository niet gevonden',
  'Link not found': 'Link niet gevonden',

  // Generic
  'Internal server error': 'Er ging iets mis op de server — probeer het opnieuw',
  'Too many requests. Please try again later.': 'Te veel verzoeken — wacht even en probeer opnieuw',
}

// Map Pydantic validation errors to Dutch field names
const FIELD_TRANSLATIONS: Record<string, string> = {
  company_name: 'Bedrijfsnaam',
  contact_name: 'Contactpersoon',
  email: 'E-mailadres',
  phone: 'Telefoon',
  address: 'Adres',
  name: 'Naam',
  password: 'Wachtwoord',
  new_password: 'Nieuw wachtwoord',
  current_password: 'Huidig wachtwoord',
  title: 'Titel',
  description: 'Beschrijving',
  subject: 'Onderwerp',
  content: 'Inhoud',
  subtotal: 'Subtotaal',
  vat_rate: 'BTW-tarief',
  issue_date: 'Factuurdatum',
  due_date: 'Vervaldatum',
  client_id: 'Klant',
  project_type: 'Projecttype',
  priority: 'Prioriteit',
  status: 'Status',
  amount: 'Bedrag',
  recipient_name: 'Ontvanger naam',
  recipient_email: 'Ontvanger e-mail',
  repo_name: 'Repository naam',
  repo_url: 'Repository URL',
  label: 'Label',
  url: 'URL',
  source_type: 'Bron',
  impact: 'Impact',
  role: 'Rol',
}

const VALIDATION_MSG_TRANSLATIONS: Record<string, string> = {
  'value is not a valid email address': 'is geen geldig e-mailadres',
  'field required': 'is verplicht',
  'Value error, Must be at least 2 characters': 'moet minimaal 2 tekens bevatten',
  'Value error, Content must be at least 5 characters': 'moet minimaal 5 tekens bevatten',
  'Value error, Description must be at least 10 characters': 'moet minimaal 10 tekens bevatten',
  'Value error, Subtotal must be positive': 'moet een positief bedrag zijn',
  'Value error, Amount must be positive': 'moet een positief bedrag zijn',
  'Value error, VAT rate must be between 0 and 100': 'moet tussen 0 en 100 zijn',
  'String should have at least 1 character': 'mag niet leeg zijn',
}

function translateDetail(detail: string): string {
  return ERROR_TRANSLATIONS[detail] || detail
}

function translateValidationErrors(errors: any[]): string {
  return errors.map((err: any) => {
    const fieldPath = err.loc?.slice(1) || []
    const fieldName = fieldPath.map((f: string) => FIELD_TRANSLATIONS[f] || f).join(' → ')

    let msg = err.msg || ''
    for (const [en, nl] of Object.entries(VALIDATION_MSG_TRANSLATIONS)) {
      if (msg.includes(en)) { msg = nl; break }
    }

    if (msg.startsWith('Value error, ')) msg = msg.replace('Value error, ', '')

    // Password specific
    if (msg.includes('Password must be at least 12 characters')) {
      msg = 'moet minimaal 12 tekens bevatten met hoofdletter, kleine letter, cijfer en speciaal teken'
    }

    return fieldName ? `${fieldName}: ${msg}` : msg
  }).join('\n')
}

export function parseApiError(err: any): { summary: string; detail: string } {
  if (!err?.response) {
    if (err?.message === 'Network Error') {
      return { summary: 'Geen verbinding', detail: 'Kan de server niet bereiken — controleer je internetverbinding' }
    }
    return { summary: 'Fout', detail: 'Er ging iets mis — probeer het opnieuw' }
  }

  const status = err.response.status
  const data = err.response.data

  // Rate limited
  if (status === 429) {
    return { summary: 'Te veel verzoeken', detail: 'Wacht even en probeer het opnieuw' }
  }

  // Validation errors (422) — Pydantic returns array of errors
  if (status === 422 && Array.isArray(data?.detail)) {
    return { summary: 'Validatiefout', detail: translateValidationErrors(data.detail) }
  }

  // String detail from backend
  if (typeof data?.detail === 'string') {
    const translated = translateDetail(data.detail)
    const summaries: Record<number, string> = {
      400: 'Ongeldig verzoek',
      401: 'Niet geautoriseerd',
      403: 'Geen toegang',
      404: 'Niet gevonden',
      409: 'Conflict',
      500: 'Serverfout',
    }
    return { summary: summaries[status] || 'Fout', detail: translated }
  }

  return { summary: 'Fout', detail: 'Er ging iets mis — probeer het opnieuw' }
}

export function useErrorHandler() {
  const toast = useToast()

  function showError(err: any, context?: string) {
    const { summary, detail } = parseApiError(err)
    toast.add({
      severity: 'error',
      summary: context || summary,
      detail,
      life: 6000,
    })
  }

  function showSuccess(message: string) {
    toast.add({ severity: 'success', summary: message, life: 3000 })
  }

  return { showError, showSuccess, parseApiError }
}
