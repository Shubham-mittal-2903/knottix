export type { SystemRole, PermissionScope } from './index';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';

export type MemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED';

export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

export type ProjectStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type ClientStatus = 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'CHURNED' | 'ARCHIVED';

export type MeetingStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED';

export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type FileStatus = 'UPLOADING' | 'ACTIVE' | 'ARCHIVED';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'MENTION'
  | 'ASSIGNMENT'
  | 'REMINDER'
  | 'SYSTEM';

export type ActivityType =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'RESTORED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'STATUS_CHANGED'
  | 'COMMENT_ADDED'
  | 'FILE_UPLOADED'
  | 'MEMBER_INVITED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'AI_ACTION'
  | 'AUTOMATION_RUN'
  | 'INTEGRATION_SYNC';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ROLE_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'AI_EXECUTION'
  | 'AUTOMATION_EXECUTION'
  | 'INTEGRATION_SYNC'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'EXPORT'
  | 'IMPORT';

export type IntegrationProvider =
  | 'GITHUB'
  | 'FIGMA'
  | 'GOOGLE'
  | 'META'
  | 'SLACK'
  | 'DISCORD'
  | 'WHATSAPP'
  | 'RAZORPAY'
  | 'STRIPE'
  | 'CLOUDFLARE'
  | 'VERCEL'
  | 'RENDER'
  | 'FIREBASE'
  | 'OPENAI'
  | 'CLAUDE'
  | 'GEMINI'
  | 'CUSTOM';

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING';

export type SettingScope =
  | 'ORGANIZATION'
  | 'WORKSPACE'
  | 'USER'
  | 'AI'
  | 'NOTIFICATION'
  | 'BRAND'
  | 'INTEGRATION'
  | 'SECURITY'
  | 'BILLING';

export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';

export type MemoryType = 'FACT' | 'PREFERENCE' | 'CONTEXT' | 'DECISION' | 'INTERACTION' | 'INSIGHT';

export type MemorySourceType =
  | 'MANUAL'
  | 'PROJECT'
  | 'CLIENT'
  | 'CONVERSATION'
  | 'AGENT'
  | 'SYSTEM'
  | 'DOCUMENT'
  | 'MEETING';

export type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'ERROR';

export type AutomationTrigger = 'SCHEDULE' | 'EVENT' | 'WEBHOOK' | 'MANUAL' | 'CONDITION';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type WorkflowExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';
