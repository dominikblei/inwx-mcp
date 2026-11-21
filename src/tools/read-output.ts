import type { ToolResult } from '../types/index.ts';

// Response allowlists only. Never serialize raw INWX objects (authCode, servicePin, bank data).
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function text(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'unknown';
}

export function number(value: unknown): number | 'unknown' {
  return typeof value === 'number' && Number.isFinite(value) ? value : 'unknown';
}

export function date(value: unknown): string {
  // Official dateTime is ISO 8601; JSON-RPC also wraps it in { scalar, xmlrpc_type, timestamp }.
  return text(typeof value === 'string' ? value : record(value)['scalar']);
}

export function success(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function error(code?: number): ToolResult {
  // Do not echo upstream messages: these may contain request or sensitive response values.
  return {
    content: [
      {
        type: 'text',
        text:
          code === undefined
            ? 'No response data returned from INWX'
            : `INWX request failed (code: ${code})`,
      },
    ],
    isError: true,
  };
}
