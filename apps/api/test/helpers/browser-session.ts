import { chromium, type Browser, type BrowserContext } from 'playwright';

export function cookiesFromHeader(cookieHeader: string, origin: string) {
  return cookieHeader.split(';').map((part) => {
    const at = part.indexOf('=');
    return {
      name: part.slice(0, at).trim(),
      value: part.slice(at + 1).trim(),
      url: origin,
    };
  });
}

export async function withBrowserSession(
  origin: string,
  cookieHeader: string,
  run: (session: {
    browser: Browser;
    context: BrowserContext;
  }) => Promise<void>,
) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addCookies(cookiesFromHeader(cookieHeader, origin));
    await run({ browser, context });
  } finally {
    await browser.close();
  }
}
