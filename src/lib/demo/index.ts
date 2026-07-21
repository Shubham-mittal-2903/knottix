export { isDemoMode, withDemo } from './config';
export { DEMO_PROJECTS, DEMO_ACTIVE_PROJECT_COUNT, type DemoProject } from './projects';
export { DEMO_TASKS, DEMO_OPEN_TASK_COUNT, type DemoTask } from './tasks';
export { DEMO_MEETINGS, DEMO_MEETINGS_TODAY_COUNT, type DemoMeeting } from './meetings';
export { DEMO_TEAM_MEMBERS, DEMO_TEAM_MEMBER_COUNT, type DemoTeamMember } from './people';
export { DEMO_ACTIVITY, type DemoActivityItem } from './activity';
export { DEMO_NOTIFICATIONS, DEMO_UNREAD_NOTIFICATION_COUNT, type DemoNotification } from './notifications';
export { DEMO_MEMORY_ENTRIES, type DemoMemoryEntry } from './memory';
export {
  DEMO_KERNEL_PHASE,
  DEMO_MODULES,
  DEMO_PROVIDERS,
  DEMO_USAGE,
  DEMO_MEMORY_HEALTH,
  DEMO_FEATURE_FLAGS,
  type DemoModuleInfo,
  type DemoProviderInfo,
  type DemoUsageSummary,
  type DemoMemoryHealth,
} from './system-health';
export { DEMO_CONVERSATIONS, type DemoConversationTurn } from './conversations';
export { DEMO_AI_RECENT_ACTIVITY } from './ai-status';
export { DEMO_SESSION_USER, DEMO_ORGANIZATION, DEMO_WORKSPACES } from './session';
export {
  DEMO_GITHUB_CONNECTED,
  DEMO_GITHUB_LOGIN,
  DEMO_REPOSITORIES,
  DEMO_GITHUB_SUMMARY,
  getDemoRepositoryDetail,
} from './github';
