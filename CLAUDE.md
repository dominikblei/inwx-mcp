# inwx-mcp

**MCP-Server für INWX Domain-Registrar** – Der erste MCP-Server mit echter Registrar-Integration.

## Projekt-Überblick

| Eigenschaft | Wert |
|-------------|------|
| **Typ** | Open-Source MCP-Server |
| **Lizenz** | MIT |
| **Registrar** | [INWX](https://www.inwx.de) (deutscher ICANN-akkreditierter Registrar) |
| **Zielgruppe** | Entwickler im DACH-Raum, Claude/Cursor/Windsurf-Nutzer |

## Motivation

Existierende Domain-MCP-Server bieten nur **read-only** Funktionen (Verfügbarkeitsprüfung, WHOIS, DNS-Lookup). Keiner ermöglicht echte Domain-Verwaltung bei einem Registrar.

`inwx-mcp` ist der **erste MCP-Server mit Registrar-Integration**:
- Domains registrieren, verlängern, transferieren
- DNS-Records direkt beim Registrar verwalten
- Contact-Handles (Inhaberdaten) pflegen

## Features / Tools

### Domain-Management

| Tool | Beschreibung |
|------|--------------|
| `domain_check` | Verfügbarkeit prüfen (einzeln oder bulk) |
| `domain_list` | Eigene Domains auflisten |
| `domain_info` | Details zu einer Domain abrufen |
| `domain_create` | Domain registrieren |
| `domain_renew` | Domain verlängern |
| `domain_transfer` | Domain von anderem Registrar transferieren |
| `domain_delete` | Domain löschen/zurückgeben |

### DNS-Management (Nameserver)

| Tool | Beschreibung |
|------|--------------|
| `dns_list` | DNS-Records einer Domain auflisten |
| `dns_create` | DNS-Record anlegen (A, AAAA, CNAME, MX, TXT, etc.) |
| `dns_update` | DNS-Record ändern |
| `dns_delete` | DNS-Record löschen |

### Contact-Management

| Tool | Beschreibung |
|------|--------------|
| `contact_list` | Contact-Handles auflisten |
| `contact_info` | Contact-Details abrufen |
| `contact_create` | Neuen Contact-Handle anlegen |
| `contact_update` | Contact-Handle aktualisieren |
| `contact_delete` | Contact-Handle löschen |

### Account

| Tool | Beschreibung |
|------|--------------|
| `account_info` | Kontostand, Vertragsdaten |

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| **Runtime** | Node.js / Bun |
| **Sprache** | TypeScript |
| **MCP SDK** | `@modelcontextprotocol/sdk` |
| **INWX Client** | `domrobot-client` (offizieller Node.js Client) |
| **Protokoll** | JSON-RPC (via domrobot-client) |
| **Validierung** | Zod |

## Architektur-Entscheidungen

### Session-Management

**Pro-Request:** Login → API-Call → Logout

Einfachste Strategie für den Start. Jeder Tool-Call ist eine eigenständige Session. Später optional auf persistente Sessions umstellen, falls Performance-Probleme auftreten.

### Error Handling (MCP Standard)

Zwei Fehler-Kategorien:

| Typ | Wann | Response |
|-----|------|----------|
| **Protocol Error** | Ungültige Requests, unbekannte Tools | JSON-RPC `error` mit Code (-32600, etc.) |
| **Tool Execution Error** | Validierung fehlgeschlagen, INWX API Error | `{ content: [...], isError: true }` |

**Wichtig:** INWX API Fehler (Code != 1000) sind **Tool Execution Errors**, keine Protocol Errors. Das LLM kann darauf reagieren und retry versuchen.

```typescript
// INWX Error → Tool Execution Error
if (response.code !== 1000) {
  return {
    content: [{ type: 'text', text: `INWX error: ${response.msg} (code: ${response.code})` }],
    isError: true
  };
}
```

### Input-Validierung

**Zod** ist der MCP-Ökosystem Standard für TypeScript.

- Server-seitig validieren (nie blind an INWX durchreichen)
- Validierungsfehler als Tool Execution Error zurückgeben
- Keine internen Details exponieren (keine Stack Traces)

```typescript
import { z } from 'zod';

const DomainCheckSchema = z.object({
  domain: z.string().min(1).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
});

// Im Tool Handler
const result = DomainCheckSchema.safeParse(input);
if (!result.success) {
  return {
    content: [{ type: 'text', text: `Invalid input: ${result.error.issues[0].message}` }],
    isError: true
  };
}
```

## INWX API

### Dokumentation

- [API-Übersicht](https://www.inwx.com/en/offer/api)
- [API-Dokumentation](https://www.inwx.com/en/help/apidoc)
- [Node.js Client (GitHub)](https://github.com/inwx/nodejs-client)
- [domrobot-client (npm)](https://www.npmjs.com/package/domrobot-client)

### Environments

| Environment | URL | Zweck |
|-------------|-----|-------|
| **OTE (Sandbox)** | `ote.inwx.de` | Entwicklung & Tests (kostenlos, keine echten Aktionen) |
| **Production** | `api.inwx.de` | Live-Betrieb (echte Kosten) |

**Wichtig:** OTE benötigt einen **separaten Account** – der Produktions-Account funktioniert dort nicht.

### Authentifizierung

```typescript
import { ApiClient, Language } from 'domrobot-client';

const client = new ApiClient(
  ApiClient.API_URL_OTE,  // oder API_URL_LIVE
  Language.DE
);

await client.login(username, password, sharedSecret?);
```

- `sharedSecret` nur bei aktivierter 2FA erforderlich
- Login-Response Code `1000` = Erfolg

### Beispiel: Domain-Verfügbarkeit prüfen

```typescript
const response = await client.callApi('domain.check', {
  domain: 'example.de'
});

if (response.resData.domain[0].avail === 1) {
  console.log('Domain verfügbar!');
}
```

## Projektstruktur

```
inwx-mcp/
├── CLAUDE.md
├── README.md                 ← Öffentliche Dokumentation
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← MCP Server Entry Point
│   ├── tools/
│   │   ├── domain.ts         ← domain_* Tools
│   │   ├── dns.ts            ← dns_* Tools
│   │   ├── contact.ts        ← contact_* Tools
│   │   └── account.ts        ← account_* Tools
│   ├── client/
│   │   └── inwx.ts           ← INWX Client Wrapper
│   └── types/
│       └── index.ts          ← TypeScript Types
├── tests/
│   ├── domain.test.ts
│   ├── dns.test.ts
│   └── contact.test.ts
└── .env.example              ← Credentials Template
```

## Konfiguration

### Environment Variables

```bash
# .env
INWX_USERNAME=your-username
INWX_PASSWORD=your-password
INWX_SHARED_SECRET=optional-2fa-secret
INWX_ENVIRONMENT=ote  # oder "live"
```

### MCP Client Configuration (Claude Desktop)

```json
{
  "mcpServers": {
    "inwx": {
      "command": "npx",
      "args": ["-y", "inwx-mcp"],
      "env": {
        "INWX_USERNAME": "...",
        "INWX_PASSWORD": "...",
        "INWX_ENVIRONMENT": "live"
      }
    }
  }
}
```

## Entwicklung

### Status

- [x] OTE-Sandbox Account erstellt (ote.inwx.de)
- [x] Architektur & Sprachauswahl finalisiert
- [x] Projekt-Setup (Bun, TypeScript, MCP SDK, domrobot-client, zod)

### Setup

```bash
# Dependencies
bun install

# OTE-Account erstellen (einmalig)
# → https://ote.inwx.de registrieren (separater Account!)

# .env anlegen
cp .env.example .env
# Credentials eintragen

# Entwicklung
bun run dev

# Tests (gegen OTE)
bun test
```

### OTE Sandbox

Die OTE-Umgebung ist **kostenlos** und ermöglicht:
- Unbegrenzte Test-Registrierungen
- Alle API-Funktionen testen
- Keine echten Kosten oder Aktionen

**Einschränkungen:**
- Separater Account erforderlich
- Daten werden regelmäßig zurückgesetzt
- Keine echten DNS-Auflösungen

## Marktanalyse

### Existierende Domain-MCP-Server (alle read-only)

| Server | Funktion | Registrierung? |
|--------|----------|----------------|
| [Instant Domain Search MCP](https://instantdomainsearch.com/mcp) | Verfügbarkeitsprüfung | ❌ |
| [domain-mcp](https://github.com/rinadelph/domain-mcp) | WHOIS, DNS, SSL | ❌ |
| [FastDomainCheck-MCP](https://github.com/bingal/FastDomainCheck-MCP-Server) | Bulk-Prüfung | ❌ |
| [mcp-domain-availability](https://github.com/imprvhub/mcp-domain-availability) | 50+ TLDs prüfen | ❌ |
| [mcp-domaintools](https://github.com/patrickdappollonio/mcp-domaintools) | DNS, WHOIS, TLS | ❌ |

### Alleinstellungsmerkmal

`inwx-mcp` ist der **einzige MCP-Server mit echter Registrar-Integration**:
- Read-write statt read-only
- Domains kaufen, nicht nur prüfen
- DNS beim Registrar verwalten
- Deutscher Registrar (DSGVO, DACH-Fokus)

## Roadmap

### Phase 1: MVP
- [ ] Projekt-Setup (Bun, TypeScript, MCP SDK)
- [ ] INWX Client Wrapper
- [ ] `domain_check`, `domain_list`, `domain_info`
- [ ] `dns_list`, `dns_create`, `dns_update`, `dns_delete`
- [ ] Tests gegen OTE

### Phase 2: Vollständige Domain-Verwaltung
- [ ] `domain_create`, `domain_renew`, `domain_delete`
- [ ] `contact_*` Tools
- [ ] `account_info`
- [ ] Error Handling & Validation

### Phase 3: Release
- [ ] README mit Beispielen
- [ ] npm-Paket veröffentlichen
- [ ] GitHub Repo (public)
- [ ] MCP Registry Eintrag

## Verwandte Projekte

- [deckpress](../deckpress/) – SaaS für Kartenset-Erstellung (Schwesterprojekt)
- [domrobot-client](https://github.com/inwx/nodejs-client) – Offizieller INWX Node.js Client
- [inwx-terraform-provider](https://registry.terraform.io/providers/inwx/inwx/latest) – Terraform Integration
