import { describe, expect, test } from 'bun:test';
import { InwxClient } from '../src/client/inwx.ts';

const client = new InwxClient({
  username: process.env['INWX_USERNAME'] ?? '',
  password: process.env['INWX_PASSWORD'] ?? '',
  environment: 'ote',
});

const hasCredentials = !!process.env['INWX_USERNAME'] && !!process.env['INWX_PASSWORD'];

describe.skipIf(!hasCredentials)('Integration Tests (OTE)', () => {
  describe('Domain Operations', () => {
    test('domain.check - available domain', async () => {
      const response = await client.call('domain.check', {
        domain: `test-${Date.now()}.de`,
      });
      expect(response.code).toBe(1000);
      expect(response.resData).toBeDefined();
    });

    test('domain.check - unavailable domain (example.de)', async () => {
      const response = await client.call<{ domain: Array<{ avail: number }> }>('domain.check', {
        domain: 'example.de',
      });
      expect(response.code).toBe(1000);
      expect(response.resData?.domain[0]?.avail).toBe(0);
    });

    test('domain.list - returns list', async () => {
      const response = await client.call('domain.list', {});
      expect(response.code).toBe(1000);
    });

    test('domain.info - non-existent domain returns error', async () => {
      const response = await client.call('domain.info', {
        domain: 'this-domain-does-not-exist-12345.de',
      });
      expect(response.code).not.toBe(1000);
    });
  });

  describe('Contact Operations', () => {
    let createdContactId: number | undefined;

    test('contact.create', async () => {
      const response = await client.call<{ id: number }>('contact.create', {
        type: 'PERSON',
        name: 'Test User',
        street: 'Teststraße 1',
        city: 'Berlin',
        pc: '10115',
        cc: 'DE',
        voice: '+49.301234567',
        email: `test-${Date.now()}@example.de`,
      });
      expect(response.code).toBe(1000);
      expect(response.resData?.id).toBeDefined();
      createdContactId = response.resData?.id;
    });

    test('contact.list', async () => {
      const response = await client.call('contact.list', {});
      expect(response.code).toBe(1000);
    });

    test('contact.info', async () => {
      if (!createdContactId) {
        console.log('Skipping - no contact created');
        return;
      }
      const response = await client.call('contact.info', { id: createdContactId });
      expect(response.code).toBe(1000);
    });

    test('contact.update', async () => {
      if (!createdContactId) {
        console.log('Skipping - no contact created');
        return;
      }
      const response = await client.call('contact.update', {
        id: createdContactId,
        street: 'Neue Straße 2',
      });
      expect(response.code).toBe(1000);
    });

    test('contact.delete', async () => {
      if (!createdContactId) {
        console.log('Skipping - no contact created');
        return;
      }
      const response = await client.call('contact.delete', { id: createdContactId });
      expect(response.code).toBe(1000);
    });
  });

  describe('Account Operations', () => {
    test('account.info', async () => {
      const response = await client.call('account.info', {});
      expect(response.code).toBe(1000);
      expect(response.resData).toBeDefined();
    });
  });

  describe('DNS Operations', () => {
    test('nameserver.info - non-existent domain returns error', async () => {
      const response = await client.call('nameserver.info', {
        domain: 'this-domain-does-not-exist-12345.de',
      });
      expect(response.code).not.toBe(1000);
    });
  });

  describe('Error Handling', () => {
    test('invalid method returns error', async () => {
      const response = await client.call('invalid.method', {});
      expect(response.code).not.toBe(1000);
    });

    test('missing required params returns error', async () => {
      const response = await client.call('domain.check', {});
      expect(response.code).not.toBe(1000);
    });
  });
});
