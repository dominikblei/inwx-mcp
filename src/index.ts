#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerDomainTools } from './tools/domain.ts';
import { registerDnsTools } from './tools/dns.ts';
import { registerContactTools } from './tools/contact.ts';
import { registerAccountTools } from './tools/account.ts';
import { registerPrompts } from './prompts.ts';

const server = new McpServer({
  name: 'inwx-mcp',
  version: '0.1.0',
});

// Register all tools
registerDomainTools(server);
registerDnsTools(server);
registerContactTools(server);
registerAccountTools(server);

// Register prompts
registerPrompts(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('inwx-mcp server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
