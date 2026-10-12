import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SUBNET_MAP,
  ipInCidr,
  resolveSubnetLabel,
  resolveWifiSource,
  type RuckusObservation,
} from '../wifi-map.js';

describe('wifi-map subnet defaults', () => {
  it('defaults to an array without leaking hardcoded private SSIDs', () => {
    expect(Array.isArray(DEFAULT_SUBNET_MAP)).toBe(true);
    expect(DEFAULT_SUBNET_MAP.every(s => s.label !== '34')).toBe(true);
  });
});

describe('ipInCidr', () => {
  it('matches IPs within a /24 subnet', () => {
    expect(ipInCidr('192.168.1.170', '192.168.1.0/24')).toBe(true);
    expect(ipInCidr('192.168.1.1', '192.168.1.0/24')).toBe(true);
  });

  it('rejects IPs outside the CIDR', () => {
    expect(ipInCidr('192.168.3.1', '192.168.1.0/24')).toBe(false);
    expect(ipInCidr('192.168.2.99', '192.168.1.0/24')).toBe(false);
  });

  it('returns false for malformed input rather than throwing', () => {
    expect(ipInCidr('not-an-ip', '192.168.1.0/23')).toBe(false);
    expect(ipInCidr('192.168.1.1', 'garbage')).toBe(false);
    expect(ipInCidr('192.168.1.1', '192.168.1.0/99')).toBe(false);
  });

  it('handles /32 and /0 edges', () => {
    expect(ipInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
    expect(ipInCidr('192.168.1.2', '192.168.1.1/32')).toBe(false);
    expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
  });
});

describe('resolveSubnetLabel', () => {
  const testSubnetMap = [{ cidr: '192.168.1.0/24', label: 'Home LAN' }];

  it('labels devices on the trusted family LAN', () => {
    expect(resolveSubnetLabel('192.168.1.170', testSubnetMap)).toBe('Home LAN');
    expect(resolveSubnetLabel('192.168.1.50', testSubnetMap)).toBe('Home LAN');
  });

  it('returns null for IPs outside the seeded subnets', () => {
    expect(resolveSubnetLabel('192.168.99.1', testSubnetMap)).toBeNull();
    expect(resolveSubnetLabel(null, testSubnetMap)).toBeNull();
    expect(resolveSubnetLabel(undefined, testSubnetMap)).toBeNull();
  });
});

describe('resolveWifiSource — grouping precedence', () => {
  const testSubnetMap = [{ cidr: '192.168.1.0/24', label: 'Home LAN' }];

  function obs(ssid: string, expected: string | null = null): RuckusObservation {
    return { ssids: [ssid], expected_ssid: expected, last_seen: new Date().toISOString() };
  }

  it('fresh Ruckus observation wins over subnet fallback', () => {
    const map = new Map<string, RuckusObservation>([
      ['aa:bb:cc:dd:ee:01', obs('Guest_WiFi')],
    ]);
    const r = resolveWifiSource('aa:bb:cc:dd:ee:01', '192.168.1.170', map, testSubnetMap);
    expect(r.label).toBe('Guest_WiFi');
    expect(r.source).toBe('ruckus');
    expect(r.ruckus?.ssids[0]).toBe('Guest_WiFi');
  });

  it('falls back to subnet when there is no Ruckus row for this MAC', () => {
    const map = new Map<string, RuckusObservation>();
    const r = resolveWifiSource('aa:bb:cc:dd:ee:02', '192.168.1.10', map, testSubnetMap);
    expect(r.label).toBe('Home LAN');
    expect(r.source).toBe('subnet');
    expect(r.ruckus).toBeNull();
  });

  it('falls back to subnet when the Ruckus row has an empty ssids array', () => {
    const map = new Map<string, RuckusObservation>([
      ['aa:bb:cc:dd:ee:03', { ssids: [], expected_ssid: null, last_seen: null }],
    ]);
    const r = resolveWifiSource('aa:bb:cc:dd:ee:03', '192.168.1.10', map, testSubnetMap);
    expect(r.label).toBe('Home LAN');
    expect(r.source).toBe('subnet');
  });

  it('returns Unknown when neither Ruckus nor subnet matches', () => {
    const map = new Map<string, RuckusObservation>();
    const r = resolveWifiSource('aa:bb:cc:dd:ee:04', '192.168.50.10', map, testSubnetMap);
    expect(r.label).toBeNull();
    expect(r.source).toBeNull();
  });

  it('returns Unknown when MAC is null (wired device with no FortiGate MAC)', () => {
    const map = new Map<string, RuckusObservation>([
      ['aa:bb:cc:dd:ee:05', obs('Home LAN')],
    ]);
    const r = resolveWifiSource(null, '8.8.8.8', map, testSubnetMap);
    expect(r.label).toBeNull();
    expect(r.source).toBeNull();
    expect(r.ruckus).toBeNull();
  });

  it('caller is responsible for MAC normalization (map miss on raw hyphen MAC)', () => {
    const map = new Map<string, RuckusObservation>([
      ['aa:bb:cc:dd:ee:06', obs('Guest_WiFi')],
    ]);
    const miss = resolveWifiSource('AA-BB-CC-DD-EE-06', '8.8.8.8', map, testSubnetMap);
    expect(miss.source).toBeNull();
    const hit = resolveWifiSource('aa:bb:cc:dd:ee:06', '8.8.8.8', map, testSubnetMap);
    expect(hit.label).toBe('Guest_WiFi');
    expect(hit.source).toBe('ruckus');
  });
});
