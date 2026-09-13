import { z } from 'zod';

// INWX API Response
export interface InwxResponse<T = unknown> {
  code: number;
  msg: string;
  reasonCode?: string;
  reason?: string;
  resData?: T;
}

// INWX's JSON-RPC transport marshals XML-RPC dateTime.iso8601 values (used
// for fields like created/updated/exDate) as an object instead of a plain
// string, e.g.:
// { scalar: '2026-12-14T08:20:04+00:00', xmlrpc_type: 'datetime', timestamp: 1797236404 }
export interface InwxDateTime {
  scalar: string;
  xmlrpc_type: string;
  timestamp: number;
}

// Domain Check Response
export interface DomainCheckResult {
  domain: string;
  avail: number; // 1 = available, 0 = not available
  status: string;
  price?: number;
  currency?: string;
}

// Domain Info Response
export interface DomainInfo {
  domain: string;
  roId: number;
  status: string;
  registrant: number;
  admin: number;
  tech: number;
  billing: number;
  ns: string[];
  created: string | InwxDateTime;
  updated: string | InwxDateTime;
  exDate: string | InwxDateTime;
}

// DNS Record
export interface DnsRecord {
  id: number;
  name: string;
  type: string;
  content: string;
  ttl: number;
  prio?: number;
}

// Contact
export interface Contact {
  id: number;
  type: string;
  name: string;
  org?: string;
  street: string;
  city: string;
  pc: string;
  cc: string;
  voice: string;
  fax?: string;
  email: string;
}

// Zod Schemas for Input Validation
export const DomainCheckSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

export const DomainListSchema = z.object({
  pagelimit: z.number().int().min(1).max(1000).optional(),
  page: z.number().int().min(1).optional(),
});

export const DomainInfoSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

export const DomainCreateSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  registrant: z.number().int().positive('Registrant contact ID is required'),
  admin: z.number().int().positive('Admin contact ID is required'),
  tech: z.number().int().positive('Tech contact ID is required'),
  billing: z.number().int().positive('Billing contact ID is required'),
  ns: z.array(z.string()).min(1, 'At least one nameserver is required').optional(),
  period: z.number().int().min(1).max(10).optional().default(1),
});

export const DomainRenewSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  period: z.number().int().min(1).max(10).optional().default(1),
});

export const DomainDeleteSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

export const DomainTransferSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  authCode: z.string().min(1, 'Auth code is required for transfer'),
  registrant: z.number().int().positive('Registrant contact ID is required'),
  admin: z.number().int().positive('Admin contact ID is required'),
  tech: z.number().int().positive('Tech contact ID is required'),
  billing: z.number().int().positive('Billing contact ID is required'),
  ns: z.array(z.string()).optional(),
});

export const DnsZoneListSchema = z.object({
  pagelimit: z.number().int().min(1).max(1000).optional(),
  page: z.number().int().min(1).optional(),
});

export const DnsZoneCreateSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

export const DnsListSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

export const DnsCreateSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA']),
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  ttl: z.number().int().min(300).max(86400).optional().default(3600),
  prio: z.number().int().min(0).max(65535).optional(),
});

// Base schema for MCP tool registration (provides .shape)
export const DnsUpdateSchemaBase = z.object({
  id: z.number().int().positive('Record ID is required'),
  content: z.string().min(1).optional(),
  ttl: z.number().int().min(300).max(86400).optional(),
  prio: z.number().int().min(0).max(65535).optional(),
});

// Full schema with refinement for validation
export const DnsUpdateSchema = DnsUpdateSchemaBase.refine(
  (data) => data.content !== undefined || data.ttl !== undefined || data.prio !== undefined,
  { message: 'At least one field (content, ttl, or prio) must be provided' }
);

export const DnsDeleteSchema = z.object({
  id: z.number().int().positive('Record ID is required'),
});

// Contact Schemas
export const ContactListSchema = z.object({
  pagelimit: z.number().int().min(1).max(1000).optional(),
  page: z.number().int().min(1).optional(),
});

export const ContactInfoSchema = z.object({
  id: z.number().int().positive('Contact ID is required'),
});

export const ContactCreateSchema = z.object({
  type: z.enum(['PERSON', 'ORG', 'ROLE']).optional().default('PERSON'),
  name: z.string().min(1, 'Name is required'),
  org: z.string().optional(),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  pc: z.string().min(1, 'Postal code is required'),
  cc: z.string().length(2, 'Country code must be 2 characters (ISO 3166)'),
  voice: z.string().min(1, 'Phone number is required'),
  fax: z.string().optional(),
  email: z.string().email('Valid email is required'),
});

// Base schema for MCP tool registration (provides .shape)
export const ContactUpdateSchemaBase = z.object({
  id: z.number().int().positive('Contact ID is required'),
  name: z.string().min(1).optional(),
  org: z.string().optional(),
  street: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  pc: z.string().min(1).optional(),
  cc: z.string().length(2).optional(),
  voice: z.string().min(1).optional(),
  fax: z.string().optional(),
  email: z.string().email().optional(),
});

// Full schema with refinement for validation
export const ContactUpdateSchema = ContactUpdateSchemaBase.refine(
  (data) =>
    data.name !== undefined ||
    data.org !== undefined ||
    data.street !== undefined ||
    data.city !== undefined ||
    data.pc !== undefined ||
    data.cc !== undefined ||
    data.voice !== undefined ||
    data.fax !== undefined ||
    data.email !== undefined,
  { message: 'At least one field to update must be provided' }
);

export const ContactDeleteSchema = z.object({
  id: z.number().int().positive('Contact ID is required'),
});

// Account Schema
export const AccountInfoSchema = z.object({});

// Tool execution result types (with index signature for MCP SDK compatibility)
export type ToolResult = {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};
