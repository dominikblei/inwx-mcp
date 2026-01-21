import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInwxClient } from '../client/inwx.ts';
import {
  DomainCheckSchema,
  DomainListSchema,
  DomainInfoSchema,
  DomainCreateSchema,
  DomainRenewSchema,
  DomainDeleteSchema,
  DomainTransferSchema,
  type DomainCheckResult,
  type DomainInfo,
  type ToolResult,
} from '../types/index.ts';

function success(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function registerDomainTools(server: McpServer) {
  // domain_check
  server.tool(
    'domain_check',
    'Check if a domain is available for registration. Returns availability status and price if available.',
    DomainCheckSchema.shape,
    async (params) => {
      const parsed = DomainCheckSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ domain: DomainCheckResult[] }>('domain.check', {
        domain: parsed.data.domain,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const result = response.resData?.domain?.[0];
      if (!result) {
        return error('No result returned from INWX');
      }

      const available = result.avail === 1;
      const text = available
        ? `Domain "${result.domain}" is AVAILABLE for registration.${result.price ? ` Price: ${result.price} ${result.currency}` : ''}`
        : `Domain "${result.domain}" is NOT AVAILABLE. Status: ${result.status}`;

      return success(text);
    }
  );

  // domain_list
  server.tool(
    'domain_list',
    'List all domains in your INWX account',
    DomainListSchema.shape,
    async (params) => {
      const parsed = DomainListSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ domain: DomainInfo[]; count: number }>('domain.list', {
        pagelimit: parsed.data.pagelimit ?? 100,
        page: parsed.data.page ?? 1,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const domains = response.resData?.domain ?? [];
      const count = response.resData?.count ?? 0;

      if (domains.length === 0) {
        return success('No domains found in your account.');
      }

      const list = domains
        .map((d) => `- ${d.domain} (expires: ${d.exDate}, status: ${d.status})`)
        .join('\n');

      return success(`Found ${count} domain(s):\n\n${list}`);
    }
  );

  // domain_info
  server.tool(
    'domain_info',
    'Get detailed information about a specific domain',
    DomainInfoSchema.shape,
    async (params) => {
      const parsed = DomainInfoSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<DomainInfo>('domain.info', {
        domain: parsed.data.domain,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const info = response.resData;
      if (!info) {
        return error('No domain info returned from INWX');
      }

      const text = [
        `Domain: ${info.domain}`,
        `Status: ${info.status}`,
        `Created: ${info.created}`,
        `Updated: ${info.updated}`,
        `Expires: ${info.exDate}`,
        `Nameservers: ${info.ns?.join(', ') ?? 'none'}`,
        `Registrant Contact ID: ${info.registrant}`,
        `Admin Contact ID: ${info.admin}`,
        `Tech Contact ID: ${info.tech}`,
      ].join('\n');

      return success(text);
    }
  );

  // domain_create
  server.tool(
    'domain_create',
    'Register a new domain. REQUIREMENTS: 1) 4 contact IDs (registrant, admin, tech, billing) - use contact_list or contact_create. All 4 can be the same ID. 2) Minimum 2 nameservers via ns parameter (e.g., ["ns.inwx.de", "ns2.inwx.de", "ns3.inwx.eu"]). AFTER registration: Call dns_zone_create if you want to manage DNS records at INWX.',
    DomainCreateSchema.shape,
    async (params) => {
      const parsed = DomainCreateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ roId: number; price: number }>('domain.create', {
        domain: parsed.data.domain,
        registrant: parsed.data.registrant,
        admin: parsed.data.admin,
        tech: parsed.data.tech,
        billing: parsed.data.billing,
        ns: parsed.data.ns,
        period: parsed.data.period,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(
        `Domain "${parsed.data.domain}" registered successfully.\n` +
          `Order ID: ${response.resData?.roId}\n` +
          `Period: ${parsed.data.period} year(s)\n` +
          `Price: ${response.resData?.price ?? 'unknown'}`
      );
    }
  );

  // domain_renew
  server.tool(
    'domain_renew',
    'Renew a domain registration',
    DomainRenewSchema.shape,
    async (params) => {
      const parsed = DomainRenewSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ price: number; exDate: string }>('domain.renew', {
        domain: parsed.data.domain,
        period: parsed.data.period,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(
        `Domain "${parsed.data.domain}" renewed successfully.\n` +
          `New expiry date: ${response.resData?.exDate ?? 'unknown'}\n` +
          `Price: ${response.resData?.price ?? 'unknown'}`
      );
    }
  );

  // domain_delete
  server.tool(
    'domain_delete',
    'Schedule a domain for deletion at the end of its registration period. The domain will not renew and will be released.',
    DomainDeleteSchema.shape,
    async (params) => {
      const parsed = DomainDeleteSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call('domain.delete', {
        domain: parsed.data.domain,
      });

      // 1000 = success, 1001 = action pending (both valid for deletion)
      if (response.code !== 1000 && response.code !== 1001) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(`Domain "${parsed.data.domain}" has been scheduled for deletion.`);
    }
  );

  // domain_transfer
  server.tool(
    'domain_transfer',
    'Transfer a domain from another registrar to INWX. Requires the auth code from the current registrar and 4 contact IDs (use contact_list or contact_create).',
    DomainTransferSchema.shape,
    async (params) => {
      const parsed = DomainTransferSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ roId: number }>('domain.transfer', {
        domain: parsed.data.domain,
        authCode: parsed.data.authCode,
        registrant: parsed.data.registrant,
        admin: parsed.data.admin,
        tech: parsed.data.tech,
        billing: parsed.data.billing,
        ns: parsed.data.ns,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(
        `Domain transfer initiated for "${parsed.data.domain}".\n` +
          `Order ID: ${response.resData?.roId}\n` +
          `Note: Transfer may take several days to complete.`
      );
    }
  );
}
