import type { RegisterSkillInput } from '../types';
import { extractAfterKeyword, extractUrl, step } from './shared';

/** Browser skills — every step calls a real, already-registered Desktop Runtime browser tool,
 *  driving the Knottix-controlled Chrome window on its dedicated, isolated profile (DEC-037). */
export function createBrowserSkills(): RegisterSkillInput[] {
  return [
    {
      key: 'open-website',
      name: 'Open Website',
      description: 'Opens a URL in the Knottix-controlled browser window.',
      category: 'browser',
      requiredTools: ['browser_open'],
      requiredPermission: 'desktop:execute',
      inputs: [{ name: 'url', type: 'string', description: 'URL to open', required: true }],
      outputs: 'The final URL loaded.',
      verificationMethod: 'Returns the page\'s actual resulting URL after navigation.',
      keywords: ['open website', 'open url', 'go to website', 'open the site'],
      buildPlan: (goalText) => {
        const url = extractUrl(goalText);
        if (!url) return null;
        return { startStepId: 's1', steps: [step('s1', 'Open URL', 'tool', { toolName: 'browser_open', params: { url } })] };
      },
    },
    {
      key: 'search-the-web',
      name: 'Search the Web',
      description: 'Opens a Google search for a query in the default browser.',
      category: 'browser',
      requiredTools: ['google_search'],
      requiredPermission: 'desktop:execute',
      inputs: [{ name: 'query', type: 'string', description: 'What to search for', required: true }],
      outputs: 'The search URL opened.',
      verificationMethod: 'A single step — the launch tool reports success/failure directly.',
      keywords: ['search google for', 'google for', 'search the web for', 'google search'],
      buildPlan: (goalText) => {
        const query = extractAfterKeyword(goalText, ['search google for', 'search the web for', 'google for', 'google search for', 'google search', 'search for']);
        if (!query) return null;
        return { startStepId: 's1', steps: [step('s1', 'Search the web', 'tool', { toolName: 'google_search', params: { query } })] };
      },
    },
    {
      key: 'read-page-content',
      name: 'Read Page Content',
      description: 'Reads the visible text content of the currently open Knottix browser tab.',
      category: 'browser',
      requiredTools: ['browser_read_page'],
      requiredPermission: 'desktop:execute',
      inputs: [],
      outputs: 'The page URL and its visible text (truncated to 4000 characters).',
      verificationMethod: 'A single read-only step — nothing to separately verify.',
      keywords: ['read the page', 'read page content', 'scrape this page', 'what does the page say'],
      buildPlan: () => ({ startStepId: 's1', steps: [step('s1', 'Read page content', 'tool', { toolName: 'browser_read_page' })] }),
    },
    {
      key: 'send-whatsapp-message',
      name: 'Send WhatsApp Message',
      description: 'Finds a WhatsApp contact, drafts a message, and sends it — the send step always requires confirmation and is never automatic.',
      category: 'browser',
      requiredTools: ['whatsapp_open', 'whatsapp_find_contact', 'whatsapp_type_message', 'whatsapp_send_message'],
      requiredPermission: 'desktop:manage',
      inputs: [
        { name: 'message', type: 'string', description: 'The message text', required: true },
        { name: 'contact', type: 'string', description: 'The contact name to send to', required: true },
      ],
      outputs: 'Confirmation the message was sent, only after the user confirms.',
      verificationMethod: 'The find-contact step reports found:false honestly if no match exists; the send step never runs without explicit confirmation.',
      keywords: ['send whatsapp', 'whatsapp message', 'message on whatsapp'],
      buildPlan: (goalText) => {
        const match = goalText.match(/\bsend\s+(?:the\s+message\s+)?["“]?([^"”]+?)["”]?\s+to\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)/i);
        if (!match) return null;
        const message = match[1].trim();
        const contact = match[2].trim();
        if (!message || !contact) return null;
        return {
          startStepId: 's1',
          steps: [
            step('s1', 'Open WhatsApp Web', 'tool', { toolName: 'whatsapp_open' }, 's2'),
            step('s2', `Find "${contact}"`, 'tool', { toolName: 'whatsapp_find_contact', params: { name: contact } }, 's3'),
            step('s3', 'Draft message', 'tool', { toolName: 'whatsapp_type_message', params: { text: message } }, 's4'),
            step('s4', `Send to ${contact}`, 'tool', { toolName: 'whatsapp_send_message' }),
          ],
        };
      },
    },
  ];
}
