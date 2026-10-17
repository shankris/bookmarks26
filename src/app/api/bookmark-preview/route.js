/* src/app/api/bookmark-preview/route.js */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8000;

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f\d]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function normalizeText(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes = {};
    const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

    let match;

    while ((match = attributePattern.exec(tag))) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    const property = attributes.property?.toLowerCase();
    const name = attributes.name?.toLowerCase();

    if (property === key.toLowerCase() || name === key.toLowerCase()) {
      return normalizeText(attributes.content ?? "");
    }
  }

  return "";
}

function getLink(html, predicate) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes = {};
    const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

    let match;

    while ((match = attributePattern.exec(tag))) {
      attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    if (predicate(attributes)) {
      return attributes.href ?? "";
    }
  }

  return "";
}

function isPublicIPv4(address) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;

  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 88));
}

function isPublicIPv6(address) {
  const value = address.toLowerCase().split("%")[0];

  if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value) || value.startsWith("ff")) {
    return false;
  }

  // IPv4-mapped IPv6 addresses need the same IPv4 checks.
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) {
    return isPublicIPv4(mapped[1]);
  }

  // Accept only global-unicast IPv6 addresses.
  return /^[23]/.test(value);
}

async function assertPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private hosts are not allowed.");
  }

  const ipVersion = isIP(host);

  if (ipVersion === 4) {
    if (!isPublicIPv4(host)) {
      throw new Error("Private addresses are not allowed.");
    }

    return;
  }

  if (ipVersion === 6) {
    if (!isPublicIPv6(host)) {
      throw new Error("Private addresses are not allowed.");
    }

    return;
  }

  const results = await lookup(host, { all: true, verbatim: true });

  if (!results.length || results.some(({ address }) => (isIP(address) === 4 ? !isPublicIPv4(address) : !isPublicIPv6(address)))) {
    throw new Error("The host does not resolve exclusively to public addresses.");
  }
}

async function fetchPublicUrl(url) {
  // Validate every redirect destination before following it.
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    await assertPublicHost(url.hostname);

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent": "StashBookmarkPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location || redirectCount === 3) {
        throw new Error("Too many redirects.");
      }

      url = new URL(location, url);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Unsupported redirect protocol.");
      }

      continue;
    }

    if (!response.ok) {
      throw new Error("The website could not be fetched.");
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new Error("The URL did not return an HTML page.");
    }

    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("The website returned an empty response.");
    }

    const chunks = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalBytes += value.byteLength;

        if (totalBytes > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error("The website HTML is too large.");
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const html = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));

    return { html, finalUrl: url };
  }

  throw new Error("The website could not be fetched.");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawUrl = body?.url;

    if (typeof rawUrl !== "string" || !rawUrl.trim()) {
      return Response.json({ error: "Please enter a website URL." }, { status: 400 });
    }

    const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;

    let url;

    try {
      url = new URL(normalized);
    } catch {
      return Response.json({ error: "Please enter a valid website URL." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
      return Response.json({ error: "Please enter a valid public website URL." }, { status: 400 });
    }

    const { html, finalUrl } = await fetchPublicUrl(url);

    const pageTitle = normalizeText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");

    const canonicalPath = getLink(html, (attributes) => (attributes.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"));

    let canonicalUrl = finalUrl.href;

    if (canonicalPath) {
      try {
        const candidate = new URL(canonicalPath, finalUrl);

        if (["http:", "https:"].includes(candidate.protocol) && candidate.hostname === finalUrl.hostname) {
          canonicalUrl = candidate.href;
        }
      } catch {
        // Ignore malformed canonical URLs.
      }
    }

    const imagePath = getMeta(html, "og:image") || getMeta(html, "og:image:url") || getMeta(html, "twitter:image");

    const faviconPath = getLink(html, (attributes) =>
      (attributes.rel ?? "")
        .toLowerCase()
        .split(/\s+/)
        .some((rel) => ["icon", "shortcut", "apple-touch-icon"].includes(rel)),
    );

    const safeAssetUrl = (path) => {
      if (!path) return "";

      try {
        const candidate = new URL(path, finalUrl);

        return ["http:", "https:"].includes(candidate.protocol) ? candidate.href : "";
      } catch {
        return "";
      }
    };

    return Response.json({
      url: canonicalUrl,
      domain: finalUrl.hostname.toLowerCase().replace(/^www\./, ""),
      title: getMeta(html, "og:title") || pageTitle,
      description: getMeta(html, "og:description") || getMeta(html, "description") || getMeta(html, "twitter:description"),
      imageUrl: safeAssetUrl(imagePath),
      faviconUrl: safeAssetUrl(faviconPath) || new URL("/favicon.ico", finalUrl).href,
      siteName: getMeta(html, "og:site_name") || finalUrl.hostname,
    });
  } catch (error) {
    console.error("Bookmark preview error:", error);

    return Response.json(
      {
        error: "We couldn't retrieve this website's details. You can still enter them manually.",
      },
      { status: 422 },
    );
  }
}
