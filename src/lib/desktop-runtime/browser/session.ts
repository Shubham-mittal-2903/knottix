import { mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { logger } from '@/lib/logger';

/**
 * A single persistent Chrome profile dedicated to Knottix's own browser automation — NOT the
 * user's regular Chrome profile. Cookies/logins persist across restarts (so WhatsApp Web /
 * Instagram stay logged in once the user scans the QR code once), but this profile starts
 * empty and never has access to the user's real banking/email/other logged-in sessions. That
 * isolation is a deliberate safety boundary, not an oversight — see DEC-037.
 */
const PROFILE_DIR = join(homedir(), 'Knottix', 'BrowserProfile');

let contextPromise: Promise<BrowserContext> | null = null;
const openPages = new Map<string, Page>();

async function launchContext(): Promise<BrowserContext> {
  await mkdir(PROFILE_DIR, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  context.on('close', () => {
    contextPromise = null;
    openPages.clear();
  });
  logger.info('desktop-runtime.browser', 'Launched persistent Chrome context', { profileDir: PROFILE_DIR });
  return context;
}

export async function getBrowserContext(): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = launchContext().catch((error) => {
      contextPromise = null;
      throw error;
    });
  }
  return contextPromise;
}

/** Returns the active page for a named tab handle, creating a fresh one if it doesn't exist yet. */
export async function getOrCreatePage(handle = 'main'): Promise<Page> {
  const existing = openPages.get(handle);
  if (existing && !existing.isClosed()) return existing;

  const context = await getBrowserContext();
  const pages = context.pages();
  const page = handle === 'main' && pages.length > 0 ? pages[0] : await context.newPage();
  openPages.set(handle, page);
  return page;
}

export function getOpenPageHandles(): string[] {
  return Array.from(openPages.entries())
    .filter(([, page]) => !page.isClosed())
    .map(([handle]) => handle);
}

export async function closePage(handle: string): Promise<boolean> {
  const page = openPages.get(handle);
  if (!page || page.isClosed()) return false;
  await page.close();
  openPages.delete(handle);
  return true;
}
