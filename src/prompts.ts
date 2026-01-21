import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer) {
  server.prompt('register-domain', 'Step-by-step guide to register a new domain', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text' as const,
          text: `# How to Register a Domain with INWX

## Prerequisites
- INWX account with sufficient balance
- Contact data (name, address, phone, email)

## Steps

### 1. Check Domain Availability
\`\`\`
domain_check(domain: "example.de")
\`\`\`
Verify the domain is available before proceeding.

### 2. Create or Find a Contact
Either create a new contact:
\`\`\`
contact_create(
  name: "Max Mustermann",
  street: "Musterstraße 1",
  city: "Berlin",
  pc: "10115",
  cc: "DE",
  voice: "+49.301234567",
  email: "max@example.de"
)
\`\`\`
Or list existing contacts to get an ID:
\`\`\`
contact_list()
\`\`\`

### 3. Register the Domain
Use the contact ID for all 4 roles (they can be the same).
**IMPORTANT: You must provide at least 2 nameservers!**
\`\`\`
domain_create(
  domain: "example.de",
  registrant: 123,
  admin: 123,
  tech: 123,
  billing: 123,
  ns: ["ns.inwx.de", "ns2.inwx.de", "ns3.inwx.eu"]
)
\`\`\`

### 4. Create DNS Zone (Required for DNS management)
**IMPORTANT: The domain registration does NOT automatically create a DNS zone.**
If you want to add DNS records (A, MX, TXT, etc.), you must create a zone first:
\`\`\`
dns_zone_create(domain: "example.de")
\`\`\`

### 5. Add DNS Records (Optional)
Now you can add DNS records:
\`\`\`
dns_create(
  domain: "example.de",
  type: "A",
  name: "@",
  content: "1.2.3.4"
)
\`\`\`

## Notes
- **Nameservers**: Minimum 2 required. Use INWX nameservers (ns.inwx.de, ns2.inwx.de, ns3.inwx.eu) or your own.
- **DNS Zone**: Must be created separately after domain registration if you want to manage DNS at INWX.
- **Contact Roles**: ICANN requires 4 contact roles (registrant=owner, admin, tech, billing). For most cases, use the same contact ID for all.
- **Phone Format**: International format with dot: +49.301234567
- **Country Code**: ISO 3166-1 alpha-2 (e.g., DE, AT, CH)
- **Period**: Registration years (1-10), defaults to 1`,
        },
      },
    ],
  }));

  server.prompt('transfer-domain', 'Step-by-step guide to transfer a domain to INWX', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text' as const,
          text: `# How to Transfer a Domain to INWX

## Prerequisites
- Auth code from current registrar
- Domain must be unlocked at current registrar
- Domain not in redemption period
- Contact data for new WHOIS

## Steps

### 1. Get Auth Code
Request the authorization code (also called EPP code or transfer key) from your current registrar.

### 2. Create or Find a Contact
\`\`\`
contact_create(
  name: "Max Mustermann",
  street: "Musterstraße 1",
  city: "Berlin",
  pc: "10115",
  cc: "DE",
  voice: "+49.301234567",
  email: "max@example.de"
)
\`\`\`

### 3. Initiate Transfer
**IMPORTANT: Provide at least 2 nameservers!**
\`\`\`
domain_transfer(
  domain: "example.de",
  authCode: "your-auth-code",
  registrant: 123,
  admin: 123,
  tech: 123,
  billing: 123,
  ns: ["ns.inwx.de", "ns2.inwx.de", "ns3.inwx.eu"]
)
\`\`\`

### 4. Create DNS Zone (After Transfer Completes)
Once the transfer is complete, create a DNS zone if you want to manage DNS at INWX:
\`\`\`
dns_zone_create(domain: "example.de")
\`\`\`

## Notes
- Transfer takes 5-7 days for most TLDs
- Some TLDs (e.g., .de) transfer instantly
- Domain will be extended by 1 year upon successful transfer
- DNS zone must be created separately after transfer`,
        },
      },
    ],
  }));

  server.prompt('manage-dns', 'Guide to managing DNS records', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text' as const,
          text: `# Managing DNS Records with INWX

## Prerequisites
- Domain must be registered in your INWX account
- Domain must use INWX nameservers
- **DNS zone must exist** - see step 1 below

## Step 1: Check/Create DNS Zone

**IMPORTANT: A DNS zone must exist before you can add records!**

First, check if a zone exists:
\`\`\`
dns_zone_list()
\`\`\`

If your domain is not listed, create a zone:
\`\`\`
dns_zone_create(domain: "example.de")
\`\`\`

## Common DNS Record Types

| Type | Purpose | Example Content |
|------|---------|-----------------|
| A | IPv4 address | 93.184.216.34 |
| AAAA | IPv6 address | 2606:2800:220:1:248:1893:25c8:1946 |
| CNAME | Alias to another domain | www.example.com |
| MX | Mail server | mail.example.de (with priority) |
| TXT | Text data, SPF, DKIM | v=spf1 include:_spf.google.com ~all |

## Operations

### List Records
\`\`\`
dns_list(domain: "example.de")
\`\`\`
Returns all records with their IDs.

### Create Record
\`\`\`
dns_create(
  domain: "example.de",
  type: "A",
  name: "www",
  content: "93.184.216.34",
  ttl: 3600
)
\`\`\`

### Create MX Record (with priority)
\`\`\`
dns_create(
  domain: "example.de",
  type: "MX",
  name: "@",
  content: "mail.example.de",
  prio: 10
)
\`\`\`

### Update Record
\`\`\`
dns_update(id: 12345, content: "new-ip", ttl: 7200)
\`\`\`

### Delete Record
\`\`\`
dns_delete(id: 12345)
\`\`\`

## Troubleshooting

### "Object does not exist" Error
This means no DNS zone exists for the domain. Create one first:
\`\`\`
dns_zone_create(domain: "example.de")
\`\`\`

## Notes
- **name: "@"** means the domain itself (example.de)
- **name: "www"** means www.example.de
- **TTL**: Time to live in seconds (min 300, max 86400)
- **prio**: Only for MX and SRV records (lower = higher priority)`,
        },
      },
    ],
  }));
}
