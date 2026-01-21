import { describe, expect, test } from 'bun:test';
import { InwxClient } from '../src/client/inwx.ts';

/**
 * Domain Lifecycle Integration Test (.com)
 *
 * Tests the complete domain lifecycle in the OTE sandbox using .com TLD.
 * Unlike .de, .com allows immediate renewal after registration.
 *
 * Steps:
 * 1. Create contact
 * 2. Check domain availability
 * 3. Register domain
 * 4. Get domain info
 * 5. Create DNS zone
 * 6. Create DNS A record
 * 7. List DNS records
 * 8. Update DNS record
 * 9. Delete DNS record
 * 10. Renew domain (works with .com!)
 * 11. Delete domain
 * 12. Delete contact
 */

const client = new InwxClient({
  username: process.env['INWX_USERNAME'] ?? '',
  password: process.env['INWX_PASSWORD'] ?? '',
  environment: 'ote',
});

const hasCredentials = !!process.env['INWX_USERNAME'] && !!process.env['INWX_PASSWORD'];

// Generate unique test identifiers
const testId = Date.now();
const testDomain = `lifecycle-test-${testId}.com`;

describe.skipIf(!hasCredentials)('Domain Lifecycle .com (OTE)', () => {
  let contactId: number;
  let dnsRecordId: number;
  let expirationDate: string;

  test('1. Create contact', async () => {
    const response = await client.call<{ id: number }>('contact.create', {
      type: 'PERSON',
      name: 'Lifecycle Test User',
      street: 'Teststraße 1',
      city: 'Berlin',
      pc: '10115',
      cc: 'DE',
      voice: '+49.301234567',
      email: `lifecycle-${testId}@example.com`,
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.id).toBeDefined();
    contactId = response.resData!.id;
    console.log(`Created contact: ${contactId}`);
  });

  test('2. Check domain availability', async () => {
    const response = await client.call<{ domain: Array<{ avail: number }> }>('domain.check', {
      domain: testDomain,
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.domain[0]?.avail).toBe(1);
    console.log(`Domain ${testDomain} is available`);
  });

  test('3. Register domain', async () => {
    expect(contactId).toBeDefined();

    const response = await client.call<{ roId: number }>('domain.create', {
      domain: testDomain,
      registrant: contactId,
      admin: contactId,
      tech: contactId,
      billing: contactId,
      ns: ['ns.inwx.de', 'ns2.inwx.de', 'ns3.inwx.eu'],
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.roId).toBeDefined();
    console.log(`Registered domain: ${testDomain}, order ID: ${response.resData?.roId}`);
  });

  test('4. Get domain info', async () => {
    const response = await client.call<{
      domain: string;
      status: string;
      registrant: number;
      exDate: { scalar: string };
    }>('domain.info', {
      domain: testDomain,
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.domain).toBe(testDomain);
    expect(response.resData?.registrant).toBe(contactId);

    // Store expiration date for renewal test
    expirationDate = response.resData?.exDate?.scalar?.split('T')[0] ?? '';
    console.log(`Domain status: ${response.resData?.status}, expires: ${expirationDate}`);
  });

  test('5. Create DNS zone', async () => {
    const response = await client.call<{ roId: number }>('nameserver.create', {
      domain: testDomain,
      type: 'MASTER',
      ns: ['ns.inwx.de', 'ns2.inwx.de', 'ns3.inwx.eu'],
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.roId).toBeDefined();
    console.log(`Created DNS zone: ${response.resData?.roId}`);
  });

  test('6. Create DNS A record', async () => {
    const response = await client.call<{ id: number }>('nameserver.createRecord', {
      domain: testDomain,
      type: 'A',
      name: 'www',
      content: '93.184.216.34',
      ttl: 3600,
    });

    expect(response.code).toBe(1000);
    expect(response.resData?.id).toBeDefined();
    dnsRecordId = response.resData!.id;
    console.log(`Created DNS record: ${dnsRecordId}`);
  });

  test('7. List DNS records', async () => {
    const response = await client.call<{
      record: Array<{ id: number; type: string; name: string }>;
    }>('nameserver.info', { domain: testDomain });

    expect(response.code).toBe(1000);
    const records = response.resData?.record ?? [];
    expect(records.length).toBeGreaterThan(0);

    const ourRecord = records.find((r) => r.id === dnsRecordId);
    expect(ourRecord).toBeDefined();
    expect(ourRecord?.type).toBe('A');
    expect(ourRecord?.name).toContain('www');
    console.log(`Found ${records.length} DNS records`);
  });

  test('8. Update DNS record', async () => {
    expect(dnsRecordId).toBeDefined();

    const response = await client.call('nameserver.updateRecord', {
      id: dnsRecordId,
      content: '192.0.2.1',
      ttl: 7200,
    });

    expect(response.code).toBe(1000);
    console.log(`Updated DNS record: ${dnsRecordId}`);
  });

  test('9. Delete DNS record', async () => {
    expect(dnsRecordId).toBeDefined();

    const response = await client.call('nameserver.deleteRecord', {
      id: dnsRecordId,
    });

    expect(response.code).toBe(1000);
    console.log(`Deleted DNS record: ${dnsRecordId}`);
  });

  test('10. Renew domain', async () => {
    expect(expirationDate).toBeDefined();

    const response = await client.call<{ exDate: { scalar: string } }>('domain.renew', {
      domain: testDomain,
      period: '1Y',
      expiration: expirationDate,
    });

    expect(response.code).toBe(1000);
    const newExpiry = response.resData?.exDate?.scalar ?? 'unknown';
    console.log(`Renewed domain, new expiry: ${newExpiry}`);
  });

  test('11. Delete domain', async () => {
    const response = await client.call('domain.delete', {
      domain: testDomain,
    });

    // 1000 = success, 1001 = action pending (both valid)
    expect([1000, 1001]).toContain(response.code);
    console.log(`Domain deletion: ${response.msg}`);
  });

  test('12. Delete contact', async () => {
    expect(contactId).toBeDefined();

    // Wait for domain deletion to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await client.call('contact.delete', {
      id: contactId,
    });

    // Contact deletion might fail if still linked - ok in OTE
    if (response.code === 1000) {
      console.log(`Deleted contact: ${contactId}`);
    } else {
      console.log(`Contact deletion returned: ${response.msg} (may still be linked)`);
    }
  });
});
