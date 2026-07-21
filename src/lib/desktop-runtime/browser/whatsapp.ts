import type { RegisterToolInput } from '@/lib/tools';
import { getOrCreatePage } from './session';

const HANDLE = 'whatsapp';
const SEARCH_BOX = '[aria-label="Search or start a new chat"]';
const MESSAGE_BOX = '[aria-label="Type a message"]';
const CHAT_LIST = '[aria-label="Chat list"]';
const QR_CANVAS = 'canvas[aria-label*="Scan this QR code"]';

/**
 * WhatsApp Web has no official automation API — this drives the real web client through
 * `aria-label`/`title` attributes (WhatsApp's own accessibility hooks), the most stable
 * selectors available; a WhatsApp Web redesign can still break these and they may need updating
 * (documented as IDEA-038). This is the user's own account, on a dedicated isolated browser
 * profile they log into themselves — there is no bulk-messaging capability, and `whatsapp_send`
 * is the only mutating step, gated by Command Center confirmation (`metadata.requiresConfirmation`).
 */
export function createWhatsAppTools(): RegisterToolInput[] {
  return [
    {
      name: 'whatsapp_open',
      description: 'Open WhatsApp Web in the Knottix-controlled browser.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });

        const loggedIn = await Promise.race([
          page
            .waitForSelector(CHAT_LIST, { timeout: 30_000 })
            .then(() => true as const),
          page
            .waitForSelector(QR_CANVAS, { timeout: 30_000 })
            .then(() => false as const),
        ]).catch(() => null);

        if (loggedIn === null) {
          return { opened: true, status: 'unknown', message: 'WhatsApp Web opened — could not confirm login state within 30s.' };
        }
        return {
          opened: true,
          status: loggedIn ? 'logged-in' : 'qr-required',
          message: loggedIn ? 'WhatsApp Web is ready.' : 'Scan the QR code shown in the Knottix browser window to log in — this only needs to happen once.',
        };
      },
    },
    {
      name: 'whatsapp_find_contact',
      description: 'Search WhatsApp Web for a contact or chat by name and open it.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [{ name: 'name', type: 'string', description: 'Contact or chat name to find', required: true }],
      version: '1.0.0',
      handler: async (input) => {
        const name = String(input.name);
        const page = await getOrCreatePage(HANDLE);

        await page.click(SEARCH_BOX);
        await page.fill(SEARCH_BOX, name);
        await page.waitForTimeout(800);

        const result = page.getByTitle(name, { exact: true }).first();
        const found = await result.isVisible().catch(() => false);
        if (!found) {
          await page.fill(SEARCH_BOX, '');
          return { found: false, message: `No contact or chat found matching "${name}".` };
        }

        await result.click();
        return { found: true, contact: name };
      },
    },
    {
      name: 'whatsapp_type_message',
      description: 'Type a draft message into the open WhatsApp chat — does NOT send it.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [{ name: 'text', type: 'string', description: 'Message text to draft', required: true }],
      version: '1.0.0',
      handler: async (input) => {
        const text = String(input.text);
        const page = await getOrCreatePage(HANDLE);
        await page.click(MESSAGE_BOX);
        await page.keyboard.type(text, { delay: 8 });
        return { typed: true, text };
      },
    },
    {
      name: 'whatsapp_preview_message',
      description: 'Read back the currently drafted (unsent) WhatsApp message text.',
      category: 'integration',
      permission: 'desktop:execute',
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        const draft = await page
          .locator(MESSAGE_BOX)
          .innerText()
          .catch(() => '');
        return { draft };
      },
    },
    {
      name: 'whatsapp_send_message',
      description: 'Send the currently drafted WhatsApp message. Always requires confirmation — never sends automatically.',
      category: 'integration',
      permission: 'desktop:manage',
      metadata: { requiresConfirmation: true, isDangerous: true },
      parameters: [],
      version: '1.0.0',
      handler: async () => {
        const page = await getOrCreatePage(HANDLE);
        await page.click(MESSAGE_BOX);
        await page.keyboard.press('Enter');
        return { sent: true };
      },
    },
  ];
}
