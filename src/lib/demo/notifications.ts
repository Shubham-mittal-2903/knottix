import type { NotificationType } from '@/types/database';

export interface DemoNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: Date;
}

const MIN = 60 * 1000;
const ago = (minutes: number) => new Date(Date.now() - minutes * MIN);

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'demo-notification-1',
    type: 'MENTION',
    title: 'Chaitanya Khanna mentioned you',
    body: 'On the ACCD Jubilee sponsor carousel design — "can we get a second look before the client call?"',
    actionUrl: '/projects',
    read: false,
    createdAt: ago(18),
  },
  {
    id: 'demo-notification-2',
    type: 'ASSIGNMENT',
    title: 'New task assigned',
    body: 'You were assigned "Fix mobile nav overlap on Safari" on ACCD Jubilee Website.',
    actionUrl: '/tasks',
    read: false,
    createdAt: ago(52),
  },
  {
    id: 'demo-notification-3',
    type: 'REMINDER',
    title: 'Meeting in 30 minutes',
    body: '"Knottix demo dry run" starts at 3:00 PM.',
    actionUrl: '/meetings',
    read: false,
    createdAt: ago(70),
  },
  {
    id: 'demo-notification-4',
    type: 'SUCCESS',
    title: 'Executive summary ready',
    body: 'Founder Executive Assistant finished this week’s summary.',
    actionUrl: '/agents/founder-executive-assistant',
    read: true,
    createdAt: ago(140),
  },
  {
    id: 'demo-notification-5',
    type: 'WARNING',
    title: 'Task blocked',
    body: '"Fix rounding bug in aggregate scores" on Judge by 4 Knotts is blocked.',
    actionUrl: '/tasks',
    read: true,
    createdAt: ago(200),
  },
  {
    id: 'demo-notification-6',
    type: 'SYSTEM',
    title: 'Weekly knowledge digest',
    body: '4 new entries were added to organizational memory this week.',
    actionUrl: '/memory',
    read: true,
    createdAt: ago(360),
  },
];

export const DEMO_UNREAD_NOTIFICATION_COUNT = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;
