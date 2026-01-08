export function requireEnv(name: "NEXT_PUBLIC_CONVEX_URL"): string {
  const value = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}
