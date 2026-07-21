import type { IntelligencePlatform } from '@/lib/intelligence';
import { registerTools } from '@/lib/agents/employees/registration';
import { createOsTools } from './os-tools';
import { createClipboardTools } from './clipboard';
import { createScreenshotTools } from './screenshot';
import { createDevTools } from './dev-tools';
import { createBrowserTools } from './browser/tools';
import { createWhatsAppTools } from './browser/whatsapp';
import { createInstagramTools } from './browser/instagram';

/**
 * Registers every Desktop Runtime tool through the exact same idempotent `registerTools()`
 * helper the AI Employees already use — the Desktop Runtime is a Tool Engine *provider*, not a
 * second registry or execution mechanism. Called once per organization inside
 * `ensureOrganizationReady()`, same as `registerAllAIEmployees`/`registerCommandCenterPrompt`.
 */
export function registerDesktopRuntimeTools(platform: IntelligencePlatform): void {
  registerTools(platform, [
    ...createOsTools(),
    ...createClipboardTools(),
    ...createScreenshotTools(),
    ...createDevTools(),
    ...createBrowserTools(),
    ...createWhatsAppTools(),
    ...createInstagramTools(),
  ]);
}
