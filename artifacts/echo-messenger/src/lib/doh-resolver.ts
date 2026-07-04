const DOH_PROVIDERS: Record<string, string> = {
  cloudflare: "https://cloudflare-dns.com/dns-query",
  google: "https://dns.google/dns-query",
  adguard: "https://dns.adguard.com/dns-query",
};

export async function resolveHostname(
  hostname: string,
  provider: "cloudflare" | "google" | "adguard" = "cloudflare"
): Promise<string | null> {
  const providers = [DOH_PROVIDERS[provider], ...Object.values(DOH_PROVIDERS).filter((p) => p !== DOH_PROVIDERS[provider])];

  for (const dohUrl of providers) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${dohUrl}?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { Accept: "application/dns-json" },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { Answer?: { data: string; type: number }[] };
      const aRecord = json.Answer?.find((r) => r.type === 1);
      if (aRecord?.data) return aRecord.data;
    } catch {
      continue;
    }
  }
  return null;
}

export async function testDoh(provider: "cloudflare" | "google" | "adguard"): Promise<boolean> {
  try {
    const result = await resolveHostname("example.com", provider);
    return result !== null;
  } catch {
    return false;
  }
}
