import type { HttpRequestArgs } from "./types.js";

const MAX_RESPONSE_SIZE = 50 * 1024;
const DEFAULT_TIMEOUT = 30000;

function isHtmlContentType(headers: Record<string, string>): boolean {
  const contentType = headers["content-type"] || "";
  return contentType.includes("text/html");
}

function htmlToText(html: string): string {
  let text = html;

  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");

  text = text.replace(/<[^>]+>/g, "");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");

  return text;
}

export async function httpRequest(args: HttpRequestArgs): Promise<string> {
  const { method, url, body, headers, timeout } = args;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
  }

  const controller = new AbortController();
  const timeoutMs = (timeout || DEFAULT_TIMEOUT / 1000) * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    const responseHeaders = Object.fromEntries(response.headers.entries());

    let responseBody = await response.text();

    if (isHtmlContentType(responseHeaders)) {
      responseBody = htmlToText(responseBody);
    }

    if (responseBody.length > MAX_RESPONSE_SIZE) {
      responseBody =
        responseBody.slice(0, MAX_RESPONSE_SIZE) + "\n... (truncated)";
    }

    const statusLine = `${response.status} ${response.statusText}`;
    const headerLines = Object.entries(responseHeaders)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    return `Status: ${statusLine}\nHeaders:\n${headerLines}\n\n${responseBody}`;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
