import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInwxClient } from '../client/inwx.ts';
import {
  DnsZoneListSchema,
  DnsZoneCreateSchema,
  DnsListSchema,
  DnsCreateSchema,
  DnsUpdateSchema,
  DnsUpdateSchemaBase,
  DnsDeleteSchema,
  type DnsRecord,
  type ToolResult,
} from '../types/index.ts';

function success(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

interface DnsZone {
  roId: number;
  domain: string;
  type: string;
}

export function registerDnsTools(server: McpServer) {
  // dns_zone_list
  server.tool(
    'dns_zone_list',
    'List all DNS zones in your account. A DNS zone must exist before you can create DNS records. Use dns_zone_create to create a zone for a domain.',
    DnsZoneListSchema.shape,
    async (params) => {
      const parsed = DnsZoneListSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ domains: DnsZone[]; count: number }>(
        'nameserver.list',
        parsed.data
      );

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const zones = response.resData?.domains ?? [];
      if (zones.length === 0) {
        return success('No DNS zones found. Use dns_zone_create to create one.');
      }

      const list = zones.map((z) => `- ${z.domain} (ID: ${z.roId}, type: ${z.type})`).join('\n');
      return success(`DNS zones (${zones.length}):\n\n${list}`);
    }
  );

  // dns_zone_create
  server.tool(
    'dns_zone_create',
    'Create a DNS zone for a domain. IMPORTANT: You must create a DNS zone before you can add DNS records (A, AAAA, MX, etc.). Call this after registering a domain if you want to manage DNS at INWX.',
    DnsZoneCreateSchema.shape,
    async (params) => {
      const parsed = DnsZoneCreateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ roId: number }>('nameserver.create', {
        domain: parsed.data.domain,
        type: 'MASTER',
        ns: ['ns.inwx.de', 'ns2.inwx.de', 'ns3.inwx.eu'],
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(
        `DNS zone created for "${parsed.data.domain}".\n` +
          `Zone ID: ${response.resData?.roId}\n` +
          `Nameservers: ns.inwx.de, ns2.inwx.de, ns3.inwx.eu\n\n` +
          `You can now add DNS records using dns_create.`
      );
    }
  );

  // dns_list
  server.tool(
    'dns_list',
    'List all DNS records for a domain. Returns record IDs needed for dns_update and dns_delete. Requires a DNS zone to exist first - use dns_zone_create if you get "Object does not exist" error.',
    DnsListSchema.shape,
    async (params) => {
      const parsed = DnsListSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ record: DnsRecord[]; count: number }>(
        'nameserver.info',
        { domain: parsed.data.domain }
      );

      if (response.code !== 1000) {
        if (response.code === 2303) {
          return error(
            `No DNS zone found for "${parsed.data.domain}". ` +
              `Create one first using dns_zone_create.`
          );
        }
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const records = response.resData?.record ?? [];
      if (records.length === 0) {
        return success(`No DNS records found for "${parsed.data.domain}".`);
      }

      const list = records
        .map((r) => {
          const prio = r.prio !== undefined ? ` (priority: ${r.prio})` : '';
          return `- [${r.id}] ${r.type} ${r.name} → ${r.content} (TTL: ${r.ttl})${prio}`;
        })
        .join('\n');

      return success(`DNS records for "${parsed.data.domain}":\n\n${list}`);
    }
  );

  // dns_create
  server.tool(
    'dns_create',
    'Create a new DNS record. PREREQUISITE: A DNS zone must exist - use dns_zone_create first if you get "Object does not exist" error. Supported types: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA. Use prio parameter for MX records (lower = higher priority).',
    DnsCreateSchema.shape,
    async (params) => {
      const parsed = DnsCreateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ id: number }>('nameserver.createRecord', {
        domain: parsed.data.domain,
        type: parsed.data.type,
        name: parsed.data.name,
        content: parsed.data.content,
        ttl: parsed.data.ttl,
        prio: parsed.data.prio,
      });

      if (response.code !== 1000) {
        if (response.code === 2303) {
          return error(
            `No DNS zone found for "${parsed.data.domain}". ` +
              `Create one first using dns_zone_create.`
          );
        }
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const id = response.resData?.id;
      return success(
        `DNS record created successfully.\n` +
          `ID: ${id}\n` +
          `Type: ${parsed.data.type}\n` +
          `Name: ${parsed.data.name}\n` +
          `Content: ${parsed.data.content}\n` +
          `TTL: ${parsed.data.ttl}`
      );
    }
  );

  // dns_update
  server.tool(
    'dns_update',
    'Update an existing DNS record by ID. Get the record ID from dns_list first.',
    DnsUpdateSchemaBase.shape,
    async (params) => {
      const parsed = DnsUpdateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const updateParams: Record<string, unknown> = { id: parsed.data.id };
      if (parsed.data.content !== undefined) updateParams['content'] = parsed.data.content;
      if (parsed.data.ttl !== undefined) updateParams['ttl'] = parsed.data.ttl;
      if (parsed.data.prio !== undefined) updateParams['prio'] = parsed.data.prio;

      const client = getInwxClient();
      const response = await client.call('nameserver.updateRecord', updateParams);

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(`DNS record ${parsed.data.id} updated successfully.`);
    }
  );

  // dns_delete
  server.tool(
    'dns_delete',
    'Delete a DNS record by ID. Get the record ID from dns_list first.',
    DnsDeleteSchema.shape,
    async (params) => {
      const parsed = DnsDeleteSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call('nameserver.deleteRecord', { id: parsed.data.id });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(`DNS record ${parsed.data.id} deleted successfully.`);
    }
  );
}
