import type { MeetingStatus } from '@/types/database';

export interface DemoMeeting {
  id: string;
  title: string;
  status: MeetingStatus;
  startTime: Date;
  endTime: Date | null;
  summary: string | null;
  workspaceId: string;
  workspace: { name: string };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNowAt(days: number, hour: number, minute = 0): Date {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const DEMO_MEETINGS: DemoMeeting[] = [
  {
    id: 'demo-meeting-1',
    title: 'Daily engineering standup',
    status: 'SCHEDULED',
    startTime: todayAt(9, 30),
    endTime: new Date(todayAt(9, 30).getTime() + 15 * 60 * 1000),
    summary: null,
    workspaceId: 'demo-workspace-product',
    workspace: { name: 'Product' },
  },
  {
    id: 'demo-meeting-2',
    title: 'ACCD Jubilee — client review',
    status: 'SCHEDULED',
    startTime: todayAt(11, 0),
    endTime: new Date(todayAt(11, 0).getTime() + HOUR),
    summary: 'Walk the client through the radar globe interaction and sponsor carousel before launch.',
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
  {
    id: 'demo-meeting-3',
    title: 'Design critique — Kreativ Website',
    status: 'SCHEDULED',
    startTime: todayAt(13, 30),
    endTime: new Date(todayAt(13, 30).getTime() + 45 * 60 * 1000),
    summary: null,
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
  {
    id: 'demo-meeting-4',
    title: 'Knottix demo dry run',
    status: 'SCHEDULED',
    startTime: todayAt(15, 0),
    endTime: new Date(todayAt(15, 0).getTime() + HOUR),
    summary: 'Full run-through of Mission Control, AI Directory, and AI Chat before tomorrow.',
    workspaceId: 'demo-workspace-product',
    workspace: { name: 'Product' },
  },
  {
    id: 'demo-meeting-5',
    title: 'Marketing sync — Q3 campaign planning',
    status: 'SCHEDULED',
    startTime: todayAt(16, 30),
    endTime: new Date(todayAt(16, 30).getTime() + 30 * 60 * 1000),
    summary: null,
    workspaceId: 'demo-workspace-internal',
    workspace: { name: 'Internal Tools' },
  },
  {
    id: 'demo-meeting-6',
    title: 'Judge scoring engine bug triage',
    status: 'SCHEDULED',
    startTime: daysFromNowAt(1, 10, 0),
    endTime: new Date(daysFromNowAt(1, 10, 0).getTime() + HOUR),
    summary: null,
    workspaceId: 'demo-workspace-product',
    workspace: { name: 'Product' },
  },
  {
    id: 'demo-meeting-7',
    title: 'CoverHub resumption call',
    status: 'SCHEDULED',
    startTime: daysFromNowAt(2, 14, 0),
    endTime: new Date(daysFromNowAt(2, 14, 0).getTime() + 30 * 60 * 1000),
    summary: null,
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
];

export const DEMO_MEETINGS_TODAY_COUNT = 5;
