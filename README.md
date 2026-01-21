# inwx-mcp

MCP Server for [INWX](https://www.inwx.de) domain registrar - the first MCP server with real registrar integration.

> **Warning**
> This tool executes real registrar operations. In `live` mode, **real costs** will be incurred. Always test in the OTE sandbox first!

## Features

Unlike other domain MCP servers that only offer read-only operations (availability checks, WHOIS lookups), `inwx-mcp` provides **full registrar integration**:

- **Domain Management**: Register, renew, transfer, and delete domains
- **DNS Management**: Create, update, and delete DNS records
- **Contact Management**: Manage WHOIS contact handles
- **Account Info**: Check balance and account details

## Installation

### Via npx (recommended)

```bash
npx inwx-mcp
```

### Via npm

```bash
npm install -g inwx-mcp
inwx-mcp
```

### From source

```bash
git clone https://github.com/your-username/inwx-mcp.git
cd inwx-mcp
bun install
bun run src/index.ts
```

## Configuration

### Environment Variables

```bash
# Required
INWX_USERNAME=your-username
INWX_PASSWORD=your-password

# Optional
INWX_ENVIRONMENT=ote          # "ote" (default) or "live"
INWX_SHARED_SECRET=secret     # Only if 2FA is enabled
```

> **Important**: OTE (sandbox) and Live use **different accounts**!
> - OTE: Register at https://ote.inwx.de (free testing)
> - Live: Register at https://www.inwx.de (real money!)

### MCP Client Configuration

This server works with any MCP-compatible client (Claude Desktop, Cursor, Windsurf, OpenAI Codex, etc.). See the [official MCP documentation](https://modelcontextprotocol.io) for client-specific setup instructions.

**Example configuration:**

```json
{
  "mcpServers": {
    "inwx": {
      "command": "npx",
      "args": ["-y", "inwx-mcp"],
      "env": {
        "INWX_USERNAME": "your-username",
        "INWX_PASSWORD": "your-password",
        "INWX_ENVIRONMENT": "ote"
      }
    }
  }
}
```

## Available Tools

### Domain Tools

| Tool | Description |
|------|-------------|
| `domain_check` | Check domain availability |
| `domain_list` | List all domains in your account |
| `domain_info` | Get domain details |
| `domain_create` | Register a new domain |
| `domain_renew` | Renew domain registration |
| `domain_transfer` | Transfer domain to INWX |
| `domain_delete` | Schedule domain for deletion |

### DNS Tools

| Tool | Description |
|------|-------------|
| `dns_zone_list` | List all DNS zones |
| `dns_zone_create` | Create DNS zone for a domain |
| `dns_list` | List DNS records |
| `dns_create` | Create DNS record |
| `dns_update` | Update DNS record |
| `dns_delete` | Delete DNS record |

### Contact Tools

| Tool | Description |
|------|-------------|
| `contact_list` | List contact handles |
| `contact_info` | Get contact details |
| `contact_create` | Create contact handle |
| `contact_update` | Update contact handle |
| `contact_delete` | Delete contact handle |

### Account Tools

| Tool | Description |
|------|-------------|
| `account_info` | Get account balance and info |

## Usage Examples

### Register a Domain

```
1. Check availability: domain_check(domain: "example.de")
2. Create contact: contact_create(name: "John Doe", ...)
3. Register: domain_create(domain: "example.de", registrant: 123, ...)
4. Create DNS zone: dns_zone_create(domain: "example.de")
5. Add DNS record: dns_create(domain: "example.de", type: "A", name: "@", content: "1.2.3.4")
```

### Important Notes

- **Nameservers**: Domain registration requires at least 2 nameservers. Use INWX nameservers: `["ns.inwx.de", "ns2.inwx.de", "ns3.inwx.eu"]`
- **DNS Zones**: After registering a domain, you must create a DNS zone before adding records
- **Contact IDs**: Domain registration requires 4 contact roles (registrant, admin, tech, billing) - they can all be the same ID

## Prompts

The server includes helpful prompts for common workflows:

- `register-domain` - Step-by-step guide to register a domain
- `transfer-domain` - Guide to transfer a domain to INWX
- `manage-dns` - Guide to managing DNS records

## Development

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/inwx-mcp.git
cd inwx-mcp

# Install dependencies
bun install

# Copy env template
cp .env.example .env
# Edit .env with your OTE credentials

# Run tests
bun test
```

### Testing

Tests run against the INWX OTE (sandbox) environment:

```bash
# Unit tests (no credentials needed)
bun test tests/schemas.test.ts

# Integration tests (requires OTE credentials)
bun test tests/integration.test.ts

# Full lifecycle tests
bun test tests/lifecycle.test.ts      # .de domain
bun test tests/lifecycle-com.test.ts  # .com domain

# All tests
bun test
```

### Project Structure

```
inwx-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── client/
│   │   └── inwx.ts       # INWX API client wrapper
│   ├── tools/
│   │   ├── domain.ts     # Domain tools
│   │   ├── dns.ts        # DNS tools
│   │   ├── contact.ts    # Contact tools
│   │   └── account.ts    # Account tools
│   ├── types/
│   │   └── index.ts      # TypeScript types & Zod schemas
│   └── prompts.ts        # MCP prompts
├── tests/
│   ├── schemas.test.ts   # Schema validation tests
│   ├── integration.test.ts
│   ├── lifecycle.test.ts
│   └── lifecycle-com.test.ts
└── ...
```

## INWX API

- [API Overview](https://www.inwx.com/en/offer/api)
- [API Documentation](https://www.inwx.com/en/help/apidoc)
- [Node.js Client](https://github.com/inwx/nodejs-client)

## Disclaimer

This software is provided "as is", without warranty of any kind. The authors are not responsible for any costs, damages, or losses incurred through the use of this software.

**Before using in production:**
1. Test thoroughly in the OTE sandbox
2. Understand INWX pricing and terms
3. Keep your credentials secure
4. Monitor your account balance

## License

MIT - see [LICENSE](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
