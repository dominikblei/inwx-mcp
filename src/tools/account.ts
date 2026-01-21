import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInwxClient } from '../client/inwx.ts';
import { AccountInfoSchema, type ToolResult } from '../types/index.ts';

function success(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

interface AccountInfo {
  customer: string;
  email: string;
  balance: number;
  currency: string;
  vatPercent: number;
}

export function registerAccountTools(server: McpServer) {
  // account_info
  server.tool(
    'account_info',
    'Get account information including balance',
    AccountInfoSchema.shape,
    async (params) => {
      const parsed = AccountInfoSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<AccountInfo>('account.info', {});

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const info = response.resData;
      if (!info) {
        return error('No account info returned from INWX');
      }

      const text = [
        `Customer: ${info.customer}`,
        `Email: ${info.email}`,
        `Balance: ${info.balance} ${info.currency}`,
        `VAT: ${info.vatPercent}%`,
      ].join('\n');

      return success(text);
    }
  );
}
