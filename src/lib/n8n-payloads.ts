interface BusinessPayloadSettings {
  companyName: string;
  email: string;
  address: string | null;
  kvkNumber: string | null;
  vatNumber: string | null;
  iban: string | null;
  bankName: string | null;
  phone: string | null;
  websiteUrl: string | null;
  invoiceFooterText?: string | null;
  quoteFooterText?: string | null;
  defaultTermsText?: string | null;
  paymentTermDays?: number;
  defaultQuoteValidDays?: number;
}

export function buildBusinessProfilePayload(settings: BusinessPayloadSettings) {
  return {
    companyName: settings.companyName,
    email: settings.email,
    address: settings.address,
    kvkNumber: settings.kvkNumber,
    vatNumber: settings.vatNumber,
    iban: settings.iban,
    bankName: settings.bankName,
    phone: settings.phone,
    websiteUrl: settings.websiteUrl,
  };
}

export function buildInvoiceDefaultsPayload(settings: BusinessPayloadSettings) {
  return {
    invoiceFooterText: settings.invoiceFooterText ?? null,
    termsText: settings.defaultTermsText ?? null,
    paymentTermDays: settings.paymentTermDays ?? 30,
  };
}

export function buildProposalDefaultsPayload(settings: BusinessPayloadSettings) {
  return {
    quoteValidDays: settings.defaultQuoteValidDays ?? 30,
    quoteFooterText: settings.quoteFooterText ?? null,
    termsText: settings.defaultTermsText ?? null,
  };
}

export function buildYearlyReportDefaultsPayload(settings: BusinessPayloadSettings) {
  return {
    footerText: settings.invoiceFooterText ?? null,
    termsText: settings.defaultTermsText ?? null,
  };
}

export function buildMonthlyReportDefaultsPayload(settings: BusinessPayloadSettings) {
  return {
    footerText: settings.invoiceFooterText ?? null,
    termsText: settings.defaultTermsText ?? null,
  };
}
