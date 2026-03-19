---
title: Interne API gebruiken voor tickets en project-intake
folder: Integraties
order: 20
---

# Endpoint

`POST /api/internal/projects`

# Authenticatie

Gebruik een Bearer token via de `Authorization` header:

```text
Authorization: Bearer JOUW_INTERNAL_API_KEY
```

# Wat deze API doet

De endpoint maakt geen los supportticket-model aan, maar zet een intake direct om naar:

- een bestaande of nieuwe klant
- een project
- optioneel een eerste logboekitem

# Minimale payload

```json
{
  "client": {
    "companyName": "Acme B.V.",
    "contactName": "Jan Jansen",
    "email": "jan@acme.nl"
  },
  "project": {
    "name": "Nieuwe intake Acme"
  }
}
```

# Veelgebruikte extra velden

- `project.description`
- `project.scope`
- `project.priority`
- `initialLogEntry.subject`
- `initialLogEntry.content`
- `source.type`
- `source.label`

# Voorbeeld met bestaand klant-ID

```json
{
  "clientId": "clx123...",
  "project": {
    "name": "Aanpassing offerteflow",
    "projectType": "OTHER",
    "status": "INTAKE",
    "priority": "HIGH"
  },
  "initialLogEntry": {
    "type": "INTERNAL",
    "subject": "Nieuwe intake via website",
    "content": "Ingekomen via website of automatisering."
  },
  "source": {
    "type": "n8n",
    "label": "Interne intake"
  }
}
```

# Voorbeeld curl

```bash
curl -X POST "https://jouwdomein.nl/api/internal/projects" \
  -H "Authorization: Bearer JOUW_INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "client": {
      "companyName": "Acme B.V.",
      "contactName": "Jan Jansen",
      "email": "jan@acme.nl"
    },
    "project": {
      "name": "Nieuwe website Acme",
      "projectType": "NEW_WEBSITE",
      "status": "INTAKE",
      "priority": "MEDIUM"
    },
    "source": {
      "type": "n8n",
      "label": "Website formulier"
    }
  }'
```

# Response

Bij succes krijg je onder andere terug:

- `client.id`
- `project.id`
- `project.slug`
- `logEntry.id` als een eerste logboekitem is meegestuurd

# Gebruik in n8n

- Sla de response op.
- Gebruik `project.id` of `project.slug` in vervolgstappen.
- Voeg eventueel later nog een offerte- of extra logboekstap toe.

# Let op

- Zonder geldige `INTERNAL_API_KEY` krijg je `401 Unauthorized`.
- Bij verkeerde payload krijg je `422 Validation failed`.
- Deze endpoint is bedoeld voor interne automatisering, niet voor publieke frontend-formulieren zonder extra afscherming.
- Oude payloads met `initialCommunication` worden nog geaccepteerd, maar gebruik voortaan `initialLogEntry`.
