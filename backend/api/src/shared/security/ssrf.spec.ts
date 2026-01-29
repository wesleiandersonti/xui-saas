import { isHostnameAllowed, isPrivateIp } from './ssrf';

describe('ssrf utils', () => {
  it('blocks private IPv4 ranges', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('192.168.1.10')).toBe(true);
    expect(isPrivateIp('172.16.0.5')).toBe(true);
    expect(isPrivateIp('169.254.10.10')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
  });

  it('blocks private IPv6 addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
  });

  it('matches allowlist domains', () => {
    expect(isHostnameAllowed('example.com', ['example.com'])).toBe(true);
    expect(isHostnameAllowed('sub.example.com', ['example.com'])).toBe(true);
    expect(isHostnameAllowed('evil.com', ['example.com'])).toBe(false);
  });
});
