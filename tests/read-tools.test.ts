import { afterEach, expect, spyOn, test } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { InwxClient } from '../src/client/inwx.ts';
import * as inwx from '../src/client/inwx.ts';
import { registerAccountTools } from '../src/tools/account.ts';
import { registerDomainTools } from '../src/tools/domain.ts';
import { registerRenewalTools } from '../src/tools/renewal.ts';

// Synthetic client only; neither environment credentials nor the transport are used.
const servers: McpServer[] = [];
const clients: Client[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const server of servers.splice(0)) await server.close();
});

async function invoke(name: string, data: unknown, args = {}, code = 1000) {
  const factory = spyOn(inwx, 'getInwxClient').mockReturnValue(
    new InwxClient({
      username: 'offline-fixture',
      password: 'offline-fixture',
      environment: 'ote',
    })
  );
  const methods: Array<[string, Record<string, unknown>]> = [];
  const mock = spyOn(InwxClient.prototype, 'call').mockImplementation(
    async <T>(method: string, params: Record<string, unknown> = {}) => {
      methods.push([method, params]);
      return { code, msg: 'DO-NOT-EXPOSE', resData: data as T };
    }
  );
  try {
    const server = new McpServer({ name: 'offline-test', version: '1' });
    registerAccountTools(server);
    registerDomainTools(server);
    registerRenewalTools(server);
    servers.push(server);
    const client = new Client({ name: 'offline-test', version: '1' });
    clients.push(client);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    await client.connect(b);
    return { result: await client.callTool({ name, arguments: args }), methods };
  } finally {
    mock.mockRestore();
    factory.mockRestore();
  }
}

// Field names follow the official account.info and accounting.accountBalance tables.
test('account_info uses customerNo/vat, never leaks unlisted account fields', async () => {
  const { result } = await invoke('account_info', {
    customerNo: 1234,
    email: 'test@example.invalid',
    currency: 'EUR',
    vat: 19,
    servicePin: 'DO-NOT-EXPOSE',
    bankAccHolderNo: 'DO-NOT-EXPOSE',
  });
  const text = JSON.stringify(result);
  expect(text).toContain('1234');
  expect(text).not.toContain('undefined');
  expect(text).not.toContain('DO-NOT-EXPOSE');
});

test('account_balance calls documented accounting.accountBalance with no parameters', async () => {
  const { result, methods } = await invoke('account_balance', {
    total: 100,
    available: 0,
    locked: 12.5,
    creditLimit: 0,
    servicePin: 'DO-NOT-EXPOSE',
  });
  expect(methods).toEqual([['accounting.accountBalance', {}]]);
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({ available: 0, locked: 12.5, creditLimit: 0 });
  expect(JSON.stringify(result)).not.toContain('DO-NOT-EXPOSE');
});

test('missing balance values are unknown, not zero', async () => {
  const { result } = await invoke('account_balance', {});
  expect(result.structuredContent).toMatchObject({ available: 'unknown', total: 'unknown' });
});

test('renewal prices request an exact TLD with explicit VAT inclusion', async () => {
  const { result, methods } = await invoke(
    'domain_renewal_prices',
    {
      price: [{ tld: 'de', renewalPrice: 6.5, currency: 'EUR', renewalPeriod: 1, vat: 19 }],
    },
    { tld: 'de' }
  );
  expect(methods).toEqual([['domain.getPrices', { tld: ['de'], vat: true }]]);
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({ tld: 'de', renewalPrice: 6.5, currency: 'EUR' });
});

test('unexpected price shape is unknown and never dumps arbitrary response fields', async () => {
  const { result } = await invoke(
    'domain_renewal_prices',
    { price: { authCode: 'DO-NOT-EXPOSE' } },
    { tld: 'de' }
  );
  expect(result.structuredContent).toMatchObject({ renewalPrice: 'unknown' });
  expect(JSON.stringify(result)).not.toContain('DO-NOT-EXPOSE');
});

test('domain renewal status preserves documented mode and dates without authCode', async () => {
  const { result, methods } = await invoke(
    'domain_renewal_status',
    {
      domain: 'example.de',
      status: 'OK',
      period: '1Y',
      renewalMode: 'AUTODELETE',
      reDate: {
        scalar: '2027-01-01T00:00:00+00:00',
        xmlrpc_type: 'datetime',
        timestamp: 1798761600,
      },
      exDate: '2027-01-02T00:00:00+00:00',
      authCode: 'DO-NOT-EXPOSE',
    },
    { domain: 'example.de' }
  );
  expect(methods).toEqual([['domain.info', { domain: 'example.de' }]]);
  expect(result.structuredContent).toMatchObject({
    renewalMode: 'AUTODELETE',
    reDate: '2027-01-01T00:00:00+00:00',
  });
  expect(JSON.stringify(result)).not.toContain('DO-NOT-EXPOSE');
});

for (const [name, args] of [
  ['account_info', {}],
  ['account_balance', {}],
  ['domain_renewal_status', { domain: 'example.de' }],
  ['domain_renewal_prices', { tld: 'de' }],
] as const) {
  test(`${name}: API errors do not leak messages or raw data`, async () => {
    const { result } = await invoke(name, { authCode: 'DO-NOT-EXPOSE' }, args, 2200);
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain('DO-NOT-EXPOSE');
    expect(JSON.stringify(result)).toContain('2200');
  });
  test(`${name}: missing resData is an error, not an empty/zero success`, async () => {
    const { result } = await invoke(name, undefined, args);
    expect(result.isError).toBe(true);
  });
}

test('invalid TLD is rejected before any API call', async () => {
  const { result, methods } = await invoke('domain_renewal_prices', {}, { tld: '.de' });
  expect(result.isError).toBe(true);
  expect(methods).toEqual([]);
});

test('explicit VAT exclusion and zero tariff are preserved; unrelated rows excluded', async () => {
  const { result, methods } = await invoke(
    'domain_renewal_prices',
    {
      price: [
        { tld: 'com', renewalPrice: 99 },
        { tld: 'de', renewalPrice: 0, currency: 'EUR', vat: 0, renewalPeriod: 1 },
      ],
    },
    { tld: 'de', vat: false }
  );
  expect(methods).toEqual([['domain.getPrices', { tld: ['de'], vat: false }]]);
  expect(result.structuredContent).toMatchObject({ renewalPrice: 0, vatIncluded: false, vat: 0 });
});

test('unknown numeric types and missing status fields remain unknown', async () => {
  const balance = await invoke('account_balance', {
    available: null,
    total: '0',
    locked: {},
    creditLimit: false,
  });
  expect(balance.result.structuredContent).toMatchObject({
    available: 'unknown',
    total: 'unknown',
    locked: 'unknown',
    creditLimit: 'unknown',
  });
  const status = await invoke(
    'domain_renewal_status',
    { renewalMode: 'surprise', exDate: {}, reDate: { scalar: null } },
    { domain: 'example.de' }
  );
  expect(status.result.structuredContent).toMatchObject({
    renewalMode: 'unknown',
    exDate: 'unknown',
    reDate: 'unknown',
    scDate: 'unknown',
    period: 'unknown',
  });
});
