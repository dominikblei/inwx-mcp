import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInwxClient } from '../client/inwx.ts';
import { AccountInfoSchema } from '../types/index.ts';
import { error, number, record, success, text } from './read-output.ts';

export function registerAccountTools(server: McpServer) {
  server.registerTool(
    'account_info',
    {
      description: 'Get safe account details. Balance is available separately via account_balance.',
      inputSchema: AccountInfoSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      const response = await getInwxClient().call('account.info', {});
      if (response.code !== 1000) return error(response.code);
      if (!response.resData) return error();
      const info = record(response.resData);
      return success({
        accountId: number(info['accountId']),
        customerId: number(info['customerId']),
        customerNo: number(info['customerNo']),
        username: text(info['username']),
        email: text(info['email']),
        currency: text(info['currency']),
        vat: number(info['vat']),
      });
    }
  );

  server.registerTool(
    'account_balance',
    {
      description:
        'Read accounting.accountBalance: total received payments, available and locked deposit, credit limit. Currency is not returned by this method; use account_info. No payments or top-ups.',
      inputSchema: AccountInfoSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      const response = await getInwxClient().call('accounting.accountBalance', {});
      if (response.code !== 1000) return error(response.code);
      if (!response.resData) return error();
      const info = record(response.resData);
      return success({
        total: number(info['total']),
        available: number(info['available']),
        locked: number(info['locked']),
        creditLimit: number(info['creditLimit']),
        currency: 'unknown',
        currencySource: 'account_info.currency',
      });
    }
  );
}
