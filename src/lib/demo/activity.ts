import type { ActivityType } from '@/types/database';

export interface DemoActivityItem {
  id: string;
  type: ActivityType;
  entityType: string;
  entityId: string;
  entityName: string | null;
  description: string | null;
  actorId: string | null;
  createdAt: Date;
}

const MIN = 60 * 1000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MIN);

export const DEMO_ACTIVITY: DemoActivityItem[] = [
  {
    id: 'demo-activity-1',
    type: 'STATUS_CHANGED',
    entityType: 'Task',
    entityId: 'demo-task-5',
    entityName: 'Code review: scoring engine refactor',
    description: 'Shubham Mittal moved "Code review: scoring engine refactor" to In Review',
    actorId: 'shubham',
    createdAt: ago(12),
  },
  {
    id: 'demo-activity-2',
    type: 'AI_ACTION',
    entityType: 'Agent',
    entityId: 'founder-executive-assistant',
    entityName: 'Founder Executive Assistant',
    description: 'Founder Executive Assistant generated a weekly executive summary',
    actorId: null,
    createdAt: ago(28),
  },
  {
    id: 'demo-activity-3',
    type: 'CREATED',
    entityType: 'Meeting',
    entityId: 'demo-meeting-4',
    entityName: 'Knottix demo dry run',
    description: 'Shubhrat Srivastava scheduled "Knottix demo dry run" for this afternoon',
    actorId: 'shubhrat',
    createdAt: ago(47),
  },
  {
    id: 'demo-activity-4',
    type: 'COMMENT_ADDED',
    entityType: 'Project',
    entityId: 'demo-project-accd',
    entityName: 'ACCD Jubilee Website',
    description: 'Chaitanya Khanna left feedback on the sponsor carousel design',
    actorId: 'chaitanya',
    createdAt: ago(63),
  },
  {
    id: 'demo-activity-5',
    type: 'AI_ACTION',
    entityType: 'Agent',
    entityId: 'developer-ai',
    entityName: 'Developer AI',
    description: 'Developer AI reviewed a pull request for the Knottix scoring engine',
    actorId: null,
    createdAt: ago(95),
  },
  {
    id: 'demo-activity-6',
    type: 'STATUS_CHANGED',
    entityType: 'Task',
    entityId: 'demo-task-7',
    entityName: 'Fix rounding bug in aggregate scores',
    description: 'Task "Fix rounding bug in aggregate scores" was marked Blocked',
    actorId: 'shubham',
    createdAt: ago(140),
  },
  {
    id: 'demo-activity-7',
    type: 'FILE_UPLOADED',
    entityType: 'Project',
    entityId: 'demo-project-kreativ',
    entityName: 'Kreativ Website',
    description: 'Manik Mowdgal uploaded the new hero reel cut for review',
    actorId: 'manik',
    createdAt: ago(210),
  },
  {
    id: 'demo-activity-8',
    type: 'ASSIGNED',
    entityType: 'Task',
    entityId: 'demo-task-20',
    entityName: 'Prepare resumption proposal for client sign-off',
    description: 'Keshav Mathur was assigned "Prepare resumption proposal for client sign-off"',
    actorId: 'keshav',
    createdAt: ago(305),
  },
];
