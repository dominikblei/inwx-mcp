import { describe, expect, test } from 'bun:test';
import {
  DomainCheckSchema,
  DomainListSchema,
  DomainCreateSchema,
  DomainTransferSchema,
  DnsCreateSchema,
  DnsUpdateSchema,
  DnsDeleteSchema,
  ContactCreateSchema,
  ContactUpdateSchema,
} from '../src/types/index.ts';

describe('Domain Schemas', () => {
  describe('DomainCheckSchema', () => {
    test('accepts valid domain', () => {
      const result = DomainCheckSchema.safeParse({ domain: 'example.de' });
      expect(result.success).toBe(true);
    });

    test('rejects empty domain', () => {
      const result = DomainCheckSchema.safeParse({ domain: '' });
      expect(result.success).toBe(false);
    });

    test('rejects missing domain', () => {
      const result = DomainCheckSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('DomainListSchema', () => {
    test('accepts empty params', () => {
      const result = DomainListSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('accepts valid pagination', () => {
      const result = DomainListSchema.safeParse({ page: 1, pagelimit: 50 });
      expect(result.success).toBe(true);
    });

    test('rejects invalid pagelimit', () => {
      const result = DomainListSchema.safeParse({ pagelimit: 5000 });
      expect(result.success).toBe(false);
    });

    test('rejects zero page', () => {
      const result = DomainListSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainCreateSchema', () => {
    const validCreate = {
      domain: 'example.de',
      registrant: 1,
      admin: 2,
      tech: 3,
      billing: 4,
    };

    test('accepts valid create params', () => {
      const result = DomainCreateSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    test('applies default period', () => {
      const result = DomainCreateSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.period).toBe(1);
      }
    });

    test('rejects missing contact IDs', () => {
      const result = DomainCreateSchema.safeParse({ domain: 'example.de' });
      expect(result.success).toBe(false);
    });

    test('rejects invalid period', () => {
      const result = DomainCreateSchema.safeParse({ ...validCreate, period: 15 });
      expect(result.success).toBe(false);
    });
  });

  describe('DomainTransferSchema', () => {
    test('requires authCode', () => {
      const result = DomainTransferSchema.safeParse({
        domain: 'example.de',
        registrant: 1,
        admin: 2,
        tech: 3,
        billing: 4,
      });
      expect(result.success).toBe(false);
    });

    test('accepts valid transfer params', () => {
      const result = DomainTransferSchema.safeParse({
        domain: 'example.de',
        authCode: 'abc123',
        registrant: 1,
        admin: 2,
        tech: 3,
        billing: 4,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('DNS Schemas', () => {
  describe('DnsCreateSchema', () => {
    test('accepts valid A record', () => {
      const result = DnsCreateSchema.safeParse({
        domain: 'example.de',
        type: 'A',
        name: 'www',
        content: '192.168.1.1',
      });
      expect(result.success).toBe(true);
    });

    test('applies default TTL', () => {
      const result = DnsCreateSchema.safeParse({
        domain: 'example.de',
        type: 'A',
        name: 'www',
        content: '192.168.1.1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ttl).toBe(3600);
      }
    });

    test('rejects invalid record type', () => {
      const result = DnsCreateSchema.safeParse({
        domain: 'example.de',
        type: 'INVALID',
        name: 'www',
        content: '192.168.1.1',
      });
      expect(result.success).toBe(false);
    });

    test('rejects TTL below minimum', () => {
      const result = DnsCreateSchema.safeParse({
        domain: 'example.de',
        type: 'A',
        name: 'www',
        content: '192.168.1.1',
        ttl: 100,
      });
      expect(result.success).toBe(false);
    });

    test('accepts MX with priority', () => {
      const result = DnsCreateSchema.safeParse({
        domain: 'example.de',
        type: 'MX',
        name: '@',
        content: 'mail.example.de',
        prio: 10,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DnsUpdateSchema', () => {
    test('requires record ID', () => {
      const result = DnsUpdateSchema.safeParse({ content: 'new-value' });
      expect(result.success).toBe(false);
    });

    test('accepts partial update', () => {
      const result = DnsUpdateSchema.safeParse({ id: 123, ttl: 7200 });
      expect(result.success).toBe(true);
    });

    test('rejects update with only ID and no changes', () => {
      const result = DnsUpdateSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });
  });

  describe('DnsDeleteSchema', () => {
    test('requires positive ID', () => {
      const result = DnsDeleteSchema.safeParse({ id: -1 });
      expect(result.success).toBe(false);
    });

    test('accepts valid ID', () => {
      const result = DnsDeleteSchema.safeParse({ id: 123 });
      expect(result.success).toBe(true);
    });
  });
});

describe('Contact Schemas', () => {
  describe('ContactCreateSchema', () => {
    const validContact = {
      name: 'John Doe',
      street: '123 Main Street',
      city: 'New York',
      pc: '10001',
      cc: 'US',
      voice: '+1.2125551234',
      email: 'john@example.com',
    };

    test('accepts valid contact', () => {
      const result = ContactCreateSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    test('applies default type', () => {
      const result = ContactCreateSchema.safeParse(validContact);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('PERSON');
      }
    });

    test('rejects invalid country code length', () => {
      const result = ContactCreateSchema.safeParse({ ...validContact, cc: 'DEU' });
      expect(result.success).toBe(false);
    });

    test('rejects invalid email', () => {
      const result = ContactCreateSchema.safeParse({ ...validContact, email: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('accepts organization contact', () => {
      const result = ContactCreateSchema.safeParse({
        ...validContact,
        type: 'ORG',
        org: 'ACME Corp',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ContactUpdateSchema', () => {
    test('requires contact ID', () => {
      const result = ContactUpdateSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(false);
    });

    test('accepts partial update', () => {
      const result = ContactUpdateSchema.safeParse({ id: 123, email: 'new@example.com' });
      expect(result.success).toBe(true);
    });

    test('rejects update with only ID and no changes', () => {
      const result = ContactUpdateSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });
  });
});
