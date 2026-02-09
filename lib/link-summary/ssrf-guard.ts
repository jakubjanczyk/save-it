import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ResolveHostname = (hostname: string) => Promise<string[]>;

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.endsWith(".") ? lower.slice(0, -1) : lower;
}

function pow2(exp: number): number {
  return 2 ** exp;
}

function parseIpv4Bytes(
  address: string
): [number, number, number, number] | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const parsed = parts.map((part) => Number.parseInt(part, 10));
  if (
    parsed.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)
  ) {
    return null;
  }

  const [b0, b1, b2, b3] = parsed;
  if (
    b0 === undefined ||
    b1 === undefined ||
    b2 === undefined ||
    b3 === undefined
  ) {
    return null;
  }

  return [b0, b1, b2, b3];
}

function ipv4ToNumber(address: string): number | null {
  const bytes = parseIpv4Bytes(address);
  if (!bytes) {
    return null;
  }

  const [b0, b1, b2, b3] = bytes;
  return ((b0 * 256 + b1) * 256 + b2) * 256 + b3;
}

function ipv4InCidr(ip: number, base: number, bits: number): boolean {
  const size = pow2(32 - bits);
  return ip >= base && ip < base + size;
}

function isBlockedIpv4(address: string): boolean {
  const ip = ipv4ToNumber(address);
  if (ip === null) {
    return true;
  }

  const ranges: [base: number, bits: number][] = [
    [0x00_00_00_00, 8], // 0.0.0.0/8
    [0x0a_00_00_00, 8], // 10.0.0.0/8
    [0x64_40_00_00, 10], // 100.64.0.0/10
    [0x7f_00_00_00, 8], // 127.0.0.0/8
    [0xa9_fe_00_00, 16], // 169.254.0.0/16
    [0xac_10_00_00, 12], // 172.16.0.0/12
    [0xc0_00_00_00, 24], // 192.0.0.0/24
    [0xc0_00_02_00, 24], // 192.0.2.0/24
    [0xc0_a8_00_00, 16], // 192.168.0.0/16
    [0xc6_12_00_00, 15], // 198.18.0.0/15
    [0xc6_33_64_00, 24], // 198.51.100.0/24
    [0xcb_00_71_00, 24], // 203.0.113.0/24
    [0xe0_00_00_00, 4], // 224.0.0.0/4 (multicast)
    [0xf0_00_00_00, 4], // 240.0.0.0/4 (reserved)
  ];

  return ranges.some(([base, bits]) => ipv4InCidr(ip, base, bits));
}

function ipv6ToHextets(address: string): number[] | null {
  if (address.includes("%")) {
    return null;
  }

  const pieces = address.split("::");
  if (pieces.length > 2) {
    return null;
  }

  const head = pieces[0] ? pieces[0].split(":").filter(Boolean) : [];
  const tail = pieces[1] ? pieces[1].split(":").filter(Boolean) : [];

  const parseParts = (parts: string[]): number[] | null => {
    const out: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) {
        return null;
      }

      if (part.includes(".")) {
        if (i !== parts.length - 1) {
          return null;
        }

        const bytes = parseIpv4Bytes(part);
        if (!bytes) {
          return null;
        }

        const [b0, b1, b2, b3] = bytes;
        out.push(b0 * 256 + b1, b2 * 256 + b3);
        continue;
      }

      const parsed = Number.parseInt(part, 16);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xff_ff) {
        return null;
      }
      out.push(parsed);
    }
    return out;
  };

  const headParsed = parseParts(head);
  const tailParsed = parseParts(tail);
  if (!(headParsed && tailParsed)) {
    return null;
  }

  const missing = 8 - (headParsed.length + tailParsed.length);
  if (missing < 0) {
    return null;
  }

  const full = [
    ...headParsed,
    ...Array.from({ length: missing }, () => 0),
    ...tailParsed,
  ];
  if (full.length !== 8) {
    return null;
  }

  return full;
}

function isBlockedIpv6(address: string): boolean {
  const hextets = ipv6ToHextets(address);
  if (!hextets || hextets.length !== 8) {
    return true;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  if (
    h0 === undefined ||
    h1 === undefined ||
    h2 === undefined ||
    h3 === undefined ||
    h4 === undefined ||
    h5 === undefined ||
    h6 === undefined ||
    h7 === undefined
  ) {
    return true;
  }

  const isAllZero =
    h0 === 0 &&
    h1 === 0 &&
    h2 === 0 &&
    h3 === 0 &&
    h4 === 0 &&
    h5 === 0 &&
    h6 === 0 &&
    h7 === 0;
  if (isAllZero) {
    return true;
  }

  const isLoopback =
    h0 === 0 &&
    h1 === 0 &&
    h2 === 0 &&
    h3 === 0 &&
    h4 === 0 &&
    h5 === 0 &&
    h6 === 0 &&
    h7 === 1;
  if (isLoopback) {
    return true;
  }

  if (h0 >= 0xfe_80 && h0 <= 0xfe_bf) {
    return true;
  }

  if (h0 >= 0xfc_00 && h0 <= 0xfd_ff) {
    return true;
  }

  if (h0 >= 0xff_00 && h0 <= 0xff_ff) {
    return true;
  }

  if (h0 === 0x20_01 && h1 === 0x0d_b8) {
    return true;
  }

  const isIpv4Mapped =
    h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0 && h5 === 0xff_ff;
  if (isIpv4Mapped) {
    const b0 = Math.floor(h6 / 256);
    const b1 = h6 % 256;
    const b2 = Math.floor(h7 / 256);
    const b3 = h7 % 256;
    return isBlockedIpv4(`${b0}.${b1}.${b2}.${b3}`);
  }

  return false;
}

function isBlockedIp(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return isBlockedIpv4(address);
  }
  if (family === 6) {
    return isBlockedIpv6(address);
  }
  return true;
}

export async function defaultResolveHostname(
  hostname: string
): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

export async function assertSafeFetchTarget(
  target: URL,
  resolveHostname: ResolveHostname
): Promise<void> {
  if (target.username || target.password) {
    throw new Error("URL credentials are not allowed");
  }

  const hostname = normalizeHostname(target.hostname);
  if (!hostname) {
    throw new Error("Invalid URL host");
  }

  if (hostname.includes("%")) {
    throw new Error("Blocked unsafe URL host");
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Blocked unsafe URL host");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Blocked private network address");
    }
    return;
  }

  const addresses = await resolveHostname(hostname);
  if (addresses.length === 0) {
    throw new Error("Failed to resolve hostname");
  }

  if (addresses.some((address) => isBlockedIp(address))) {
    throw new Error("Blocked private network address");
  }
}
