import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getInwxClient } from '../client/inwx.ts';
import { DomainInfoSchema } from '../types/index.ts';
import { date, error, number, record, success, text } from './read-output.ts';

const RenewalPricesSchema = z.object({
  tld: z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i, 'Use a TLD without a leading dot'),
  vat: z.boolean().default(true),
});

export function registerRenewalTools(server: McpServer) {
  server.registerTool(
    'domain_renewal_prices',
    {
      description:
        'Read TLD renewal tariff via domain.getPrices (not a domain-specific/premium quote or future invoice). VAT is explicitly included by default. Returns annual/monthly tariff and renewal period in years. Does not renew anything.',
      inputSchema: RenewalPricesSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (params) => {
      const { tld, vat } = RenewalPricesSchema.parse(params);
      const response = await getInwxClient().call('domain.getPrices', { tld: [tld], vat });
      if (response.code !== 1000) return error(response.code);
      if (!response.resData) return error();
      const prices = record(response.resData)['price'];
      const price = record(
        Array.isArray(prices) ? prices.find((item) => record(item)['tld'] === tld) : undefined
      );
      return success({
        tld,
        vatIncluded: vat,
        currency: text(price['currency']),
        vat: number(price['vat']),
        renewalPrice: number(price['renewalPrice']),
        monthlyRenewalPrice: number(price['monthlyRenewalPrice']),
        renewalPeriod: number(price['renewalPeriod']),
        scope:
          'TLD tariff, not a domain-specific quote; premiums, promotions, trustee fees and future changes may differ',
      });
    }
  );

  server.registerTool(
    'domain_renewal_status',
    {
      description:
        'Read renewalMode, period, status and renewal/expiry/scheduled dates via domain.info. AUTORENEW, AUTODELETE or AUTOEXPIRE are API settings, not proof of a paid or guaranteed renewal. No authCode or contact data returned.',
      inputSchema: DomainInfoSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (params) => {
      const { domain } = DomainInfoSchema.parse(params);
      const response = await getInwxClient().call('domain.info', { domain });
      if (response.code !== 1000) return error(response.code);
      if (!response.resData) return error();
      const info = record(response.resData);
      const mode = info['renewalMode'];
      return success({
        domain: text(info['domain']),
        status: text(info['status']),
        period: text(info['period']),
        renewalMode: ['AUTORENEW', 'AUTODELETE', 'AUTOEXPIRE'].includes(String(mode))
          ? mode
          : 'unknown',
        reDate: date(info['reDate']),
        exDate: date(info['exDate']),
        scDate: date(info['scDate']),
      });
    }
  );
}
