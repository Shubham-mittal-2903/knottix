import { mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { RegisterToolInput, ToolParameterDefinition } from '@/lib/tools';
import { closePage, getBrowserContext, getOpenPageHandles, getOrCreatePage } from './session';

const HANDLE_PARAM: ToolParameterDefinition = {
  name: 'handle',
  type: 'string',
  description: 'Tab handle to act on. Defaults to "main".',
  required: false,
  defaultValue: 'main',
};

function handleOf(input: Record<string, unknown>): string {
  return typeof input.handle === 'string' && input.handle ? input.handle : 'main';
}

function searchUrl(engine: 'google' | 'youtube', query: string): string {
  const q = encodeURIComponent(query);
  return engine === 'google' ? `https://www.google.com/search?q=${q}` : `https://www.youtube.com/results?search_query=${q}`;
}

const SCREENSHOT_DIR = join(homedir(), 'Knottix', 'Screenshots');

/**
 * Real Playwright automation of an actual, visible Chrome window (headless: false) — every tool
 * drives the same persistent browser context (`session.ts`). Keyboard/mouse actions here are
 * page-scoped (`page.click`, `page.keyboard.type`) rather than global OS input simulation, which
 * is the deliberate safety boundary from DEC-037: these actions can only affect the Knottix
 * browser window Playwright itself controls, never whatever window happens to have OS focus.
 */
export function createBrowserTools(): RegisterToolInput[] {
  return [
    {
      name: 'browser_open',
      description: 'Open a URL in the Knottix-controlled Chrome window (creates the window on first use).',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'url', type: 'string', description: 'URL to open', required: true },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.goto(String(input.url), { waitUntil: 'domcontentloaded' });
        return { url: page.url(), handle: handleOf(input) };
      },
    },
    {
      name: 'browser_navigate',
      description: 'Navigate an already-open tab to a new URL.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'url', type: 'string', description: 'URL to navigate to', required: true },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.goto(String(input.url), { waitUntil: 'domcontentloaded' });
        return { url: page.url(), handle: handleOf(input) };
      },
    },
    {
      name: 'browser_search',
      description: 'Search Google or YouTube in the Knottix-controlled browser.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'query', type: 'string', description: 'What to search for', required: true },
        { name: 'engine', type: 'string', description: 'Search engine', required: false, enum: ['google', 'youtube'], defaultValue: 'google' },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const engine = input.engine === 'youtube' ? 'youtube' : 'google';
        const page = await getOrCreatePage(handleOf(input));
        const url = searchUrl(engine, String(input.query));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        return { engine, query: input.query, url };
      },
    },
    {
      name: 'browser_fill',
      description: 'Fill a text field on the current page (by CSS selector) with text.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'selector', type: 'string', description: 'CSS selector of the input/textarea', required: true },
        { name: 'text', type: 'string', description: 'Text to type into the field', required: true },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.fill(String(input.selector), String(input.text));
        return { filled: true, selector: input.selector };
      },
    },
    {
      name: 'browser_click',
      description: 'Click an element on the current page by CSS selector.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'selector', type: 'string', description: 'CSS selector of the element to click', required: true },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.click(String(input.selector));
        return { clicked: true, selector: input.selector };
      },
    },
    {
      name: 'browser_new_tab',
      description: 'Open a new browser tab, optionally navigating it to a URL.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'handle', type: 'string', description: 'Name for the new tab handle', required: true },
        { name: 'url', type: 'string', description: 'URL to open in the new tab', required: false },
      ],
      version: '1.0.0',
      handler: async (input) => {
        const handle = String(input.handle);
        const page = await getOrCreatePage(handle);
        if (typeof input.url === 'string' && input.url) {
          await page.goto(input.url, { waitUntil: 'domcontentloaded' });
        }
        return { handle, url: page.url() };
      },
    },
    {
      name: 'browser_close_tab',
      description: 'Close a browser tab by handle.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [HANDLE_PARAM],
      version: '1.0.0',
      handler: async (input) => {
        const closed = await closePage(handleOf(input));
        return { closed };
      },
    },
    {
      name: 'browser_switch_tab',
      description: 'Bring a browser tab to the front by handle.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [HANDLE_PARAM],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.bringToFront();
        return { switched: true, handle: handleOf(input) };
      },
    },
    {
      name: 'browser_list_tabs',
      description: 'List currently open browser tab handles.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => ({ handles: getOpenPageHandles() }),
    },
    {
      name: 'browser_read_page',
      description: 'Read the visible text content of the current page.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [HANDLE_PARAM],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        const text = await page.evaluate(() => document.body?.innerText ?? '');
        const truncated = text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
        return { url: page.url(), text: truncated };
      },
    },
    {
      name: 'browser_screenshot',
      description: 'Capture a screenshot of the current page and save it as a PNG.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [HANDLE_PARAM],
      version: '1.0.0',
      handler: async (input) => {
        await mkdir(SCREENSHOT_DIR, { recursive: true });
        const page = await getOrCreatePage(handleOf(input));
        const filePath = join(SCREENSHOT_DIR, `browser-${Date.now()}.png`);
        await page.screenshot({ path: filePath });
        return { path: filePath };
      },
    },
    {
      name: 'browser_scroll',
      description: 'Scroll the current page up or down.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [
        { name: 'direction', type: 'string', description: 'Scroll direction', required: false, enum: ['up', 'down'], defaultValue: 'down' },
        { name: 'amount', type: 'number', description: 'Pixels to scroll', required: false, defaultValue: 800 },
        HANDLE_PARAM,
      ],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        const amount = typeof input.amount === 'number' ? input.amount : 800;
        const delta = input.direction === 'up' ? -amount : amount;
        await page.mouse.wheel(0, delta);
        return { scrolled: true, delta };
      },
    },
    {
      name: 'open_browser_devtools',
      description: 'Open Chrome DevTools for the current Knottix-controlled browser tab.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [HANDLE_PARAM],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(handleOf(input));
        await page.bringToFront();
        await page.keyboard.press('F12');
        return { opened: true };
      },
    },
  ];
}

export { getBrowserContext };
