import type { RegisterToolInput } from '@/lib/tools';
import { getOrCreatePage } from './session';

const HANDLE = 'instagram';

export function createInstagramTools(): RegisterToolInput[] {
  return [
    {
      name: 'instagram_open',
      description: 'Open Instagram in the Knottix-controlled browser.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        return { opened: true, url: page.url() };
      },
    },
    {
      name: 'instagram_open_profile',
      description: 'Open an Instagram profile by username, or the logged-in user\'s own profile if no username is given.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [{ name: 'username', type: 'string', description: 'Instagram username, without @', required: false }],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(HANDLE);
        if (typeof input.username === 'string' && input.username) {
          const username = input.username.replace(/^@/, '');
          await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'domcontentloaded' });
          return { opened: true, username, url: page.url() };
        }
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        const profileLink = page.getByRole('link', { name: 'Profile', exact: false }).first();
        await profileLink.click();
        return { opened: true, username: 'me', url: page.url() };
      },
    },
    {
      name: 'instagram_search_users',
      description: 'Search Instagram for users matching a query and read the visible results.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [{ name: 'query', type: 'string', description: 'Username or name to search for', required: true }],
      version: '1.0.0',
      handler: async (input) => {
        const query = String(input.query);
        const page = await getOrCreatePage(HANDLE);
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        const searchLink = page.getByRole('link', { name: 'Search', exact: false }).first();
        await searchLink.click();
        const searchBox = page.getByRole('textbox').first();
        await searchBox.fill(query);
        await page.waitForTimeout(1000);
        const text = await page.evaluate(() => document.body?.innerText ?? '');
        return { query, results: text.length > 2000 ? `${text.slice(0, 2000)}…` : text };
      },
    },
    {
      name: 'instagram_open_reels',
      description: 'Open the Instagram Reels feed.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        await page.goto('https://www.instagram.com/reels/', { waitUntil: 'domcontentloaded' });
        return { opened: true, url: page.url() };
      },
    },
    {
      name: 'instagram_scroll_feed',
      description: 'Scroll the current Instagram feed down.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [{ name: 'amount', type: 'number', description: 'Pixels to scroll', required: false, defaultValue: 1000 }],
      version: '1.0.0',
      handler: async (input) => {
        const page = await getOrCreatePage(HANDLE);
        const amount = typeof input.amount === 'number' ? input.amount : 1000;
        await page.mouse.wheel(0, amount);
        return { scrolled: true, amount };
      },
    },
    {
      name: 'instagram_read_visible_content',
      description: 'Read the visible text content of the current Instagram page.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        const text = await page.evaluate(() => document.body?.innerText ?? '');
        return { url: page.url(), text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text };
      },
    },
  ];
}
