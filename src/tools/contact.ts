import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getInwxClient } from '../client/inwx.ts';
import {
  ContactListSchema,
  ContactInfoSchema,
  ContactCreateSchema,
  ContactUpdateSchema,
  ContactUpdateSchemaBase,
  ContactDeleteSchema,
  type Contact,
  type ToolResult,
} from '../types/index.ts';

function success(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function registerContactTools(server: McpServer) {
  // contact_list
  server.tool(
    'contact_list',
    'List all contact handles in your INWX account. Contact IDs are required for domain_create and domain_transfer.',
    ContactListSchema.shape,
    async (params) => {
      const parsed = ContactListSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ contact: Contact[]; count: number }>('contact.list', {
        pagelimit: parsed.data.pagelimit ?? 100,
        page: parsed.data.page ?? 1,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const contacts = response.resData?.contact ?? [];
      const count = response.resData?.count ?? 0;

      if (contacts.length === 0) {
        return success('No contacts found in your account.');
      }

      const list = contacts
        .map((c) => `- [${c.id}] ${c.name}${c.org ? ` (${c.org})` : ''} - ${c.email}`)
        .join('\n');

      return success(`Found ${count} contact(s):\n\n${list}`);
    }
  );

  // contact_info
  server.tool(
    'contact_info',
    'Get detailed information about a contact handle',
    ContactInfoSchema.shape,
    async (params) => {
      const parsed = ContactInfoSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ contact: Contact }>('contact.info', {
        id: parsed.data.id,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      const contact = response.resData?.contact;
      if (!contact) {
        return error('No contact info returned from INWX');
      }

      const text = [
        `Contact ID: ${contact.id}`,
        `Type: ${contact.type}`,
        `Name: ${contact.name}`,
        contact.org ? `Organization: ${contact.org}` : null,
        `Street: ${contact.street}`,
        `City: ${contact.city}`,
        `Postal Code: ${contact.pc}`,
        `Country: ${contact.cc}`,
        `Phone: ${contact.voice}`,
        contact.fax ? `Fax: ${contact.fax}` : null,
        `Email: ${contact.email}`,
      ]
        .filter(Boolean)
        .join('\n');

      return success(text);
    }
  );

  // contact_create
  server.tool(
    'contact_create',
    'Create a new contact handle (WHOIS contact). Required before registering domains. Returns a contact ID to use with domain_create. Phone format: +49.301234567 (country code dot number).',
    ContactCreateSchema.shape,
    async (params) => {
      const parsed = ContactCreateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call<{ id: number }>('contact.create', {
        type: parsed.data.type,
        name: parsed.data.name,
        org: parsed.data.org,
        street: parsed.data.street,
        city: parsed.data.city,
        pc: parsed.data.pc,
        cc: parsed.data.cc,
        voice: parsed.data.voice,
        fax: parsed.data.fax,
        email: parsed.data.email,
      });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(
        `Contact created successfully.\n` +
          `Contact ID: ${response.resData?.id}\n` +
          `Name: ${parsed.data.name}`
      );
    }
  );

  // contact_update
  server.tool(
    'contact_update',
    'Update an existing contact handle',
    ContactUpdateSchemaBase.shape,
    async (params) => {
      const parsed = ContactUpdateSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const updateParams: Record<string, unknown> = { id: parsed.data.id };
      if (parsed.data.name !== undefined) updateParams['name'] = parsed.data.name;
      if (parsed.data.org !== undefined) updateParams['org'] = parsed.data.org;
      if (parsed.data.street !== undefined) updateParams['street'] = parsed.data.street;
      if (parsed.data.city !== undefined) updateParams['city'] = parsed.data.city;
      if (parsed.data.pc !== undefined) updateParams['pc'] = parsed.data.pc;
      if (parsed.data.cc !== undefined) updateParams['cc'] = parsed.data.cc;
      if (parsed.data.voice !== undefined) updateParams['voice'] = parsed.data.voice;
      if (parsed.data.fax !== undefined) updateParams['fax'] = parsed.data.fax;
      if (parsed.data.email !== undefined) updateParams['email'] = parsed.data.email;

      const client = getInwxClient();
      const response = await client.call('contact.update', updateParams);

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(`Contact ${parsed.data.id} updated successfully.`);
    }
  );

  // contact_delete
  server.tool(
    'contact_delete',
    'Delete a contact handle. Will fail if the contact is still linked to any domain.',
    ContactDeleteSchema.shape,
    async (params) => {
      const parsed = ContactDeleteSchema.safeParse(params);
      if (!parsed.success) {
        return error(`Invalid input: ${parsed.error.issues[0]?.message}`);
      }

      const client = getInwxClient();
      const response = await client.call('contact.delete', { id: parsed.data.id });

      if (response.code !== 1000) {
        return error(`INWX error: ${response.msg} (code: ${response.code})`);
      }

      return success(`Contact ${parsed.data.id} deleted successfully.`);
    }
  );
}
