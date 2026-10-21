// Never send chat to a static hosting origin or an unconfigured production backend.
export function guideEndpoint(
  configured: string | undefined,
  development: boolean,
): string | undefined {
  const value = configured || (development ? "http://127.0.0.1:3001" : "");
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return;
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (
      url.protocol !== "https:" &&
      !(development && local && url.protocol === "http:")
    )
      return;
    return value.replace(/\/+$/, "");
  } catch {
    return;
  }
}
