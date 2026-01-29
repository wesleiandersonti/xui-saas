import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { promises as dns } from 'dns';
import net from 'net';

export interface SsrfGuardOptions {
  allowlist?: string[];
}

export async function assertSafeUrl(rawUrl: string, options: SsrfGuardOptions = {}): Promise<URL> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL invalida');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('A URL deve usar http ou https');
  }

  const hostname = normalizeHostname(parsed.hostname);

  if (!hostname) {
    throw new BadRequestException('URL invalida');
  }

  if (isLocalHostname(hostname)) {
    throw new ForbiddenException('Host local bloqueado');
  }

  if (options.allowlist && options.allowlist.length > 0) {
    if (!isHostnameAllowed(hostname, options.allowlist)) {
      throw new ForbiddenException('Host nao permitido');
    }
  }

  await assertPublicHostname(hostname);
  return parsed;
}

export function isHostnameAllowed(hostname: string, allowlist: string[]): boolean {
  const normalized = normalizeHostname(hostname);

  return allowlist.some((entry) => {
    const allowed = normalizeHostname(entry);
    if (!allowed) {
      return false;
    }
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

export function isPrivateIp(address: string): boolean {
  const family = net.isIP(address);

  if (family === 4) {
    return isPrivateIpv4(address);
  }

  if (family === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

function normalizeHostname(hostname: string): string {
  return String(hostname || '').trim().replace(/\.$/, '').toLowerCase();
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local');
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ForbiddenException('IP privado bloqueado');
    }
    return;
  }

  let records: dns.LookupAddress[];

  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new BadRequestException('Nao foi possivel resolver o host');
  }

  if (!records || records.length === 0) {
    throw new BadRequestException('Nao foi possivel resolver o host');
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new ForbiddenException('Resolucao para IP privado bloqueada');
    }
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const ip =
    parts[0] * 256 * 256 * 256 +
    parts[1] * 256 * 256 +
    parts[2] * 256 +
    parts[3];

  const ranges: Array<[number, number]> = [
    [0x0a000000, 0x0affffff], // 10.0.0.0/8
    [0x7f000000, 0x7fffffff], // 127.0.0.0/8
    [0xac100000, 0xac1fffff], // 172.16.0.0/12
    [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
    [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
    [0x00000000, 0x00ffffff], // 0.0.0.0/8
    [0x64400000, 0x647fffff], // 100.64.0.0/10
    [0xc0000200, 0xc00002ff], // 192.0.2.0/24
    [0xc6120000, 0xc613ffff], // 198.18.0.0/15
    [0xc6336400, 0xc63364ff], // 198.51.100.0/24
    [0xcb007100, 0xcb0071ff], // 203.0.113.0/24
    [0xe0000000, 0xffffffff], // 224.0.0.0/4 and 240.0.0.0/4
  ];

  return ranges.some(([start, end]) => ip >= start && ip <= end);
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  if (normalized.startsWith('fe80')) {
    return true;
  }

  if (normalized.startsWith('2001:db8')) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    const v4 = normalized.replace('::ffff:', '');
    if (net.isIP(v4) === 4) {
      return isPrivateIpv4(v4);
    }
  }

  return false;
}
