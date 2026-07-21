import type { Priority, ProjectStatus } from '@/types/database';

export interface DemoProject {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: Priority;
  dueDate: Date | null;
  workspaceId: string;
  workspace: { name: string };
}

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();
const inDays = (n: number) => new Date(now().getTime() + n * DAY);

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-project-accd',
    title: 'ACCD Jubilee Website',
    status: 'ACTIVE',
    priority: 'HIGH',
    dueDate: inDays(9),
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
  {
    id: 'demo-project-judge',
    title: 'Judge by 4 Knotts',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    dueDate: inDays(4),
    workspaceId: 'demo-workspace-product',
    workspace: { name: 'Product' },
  },
  {
    id: 'demo-project-knottix',
    title: 'Knottix',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    dueDate: inDays(21),
    workspaceId: 'demo-workspace-product',
    workspace: { name: 'Product' },
  },
  {
    id: 'demo-project-kreativ',
    title: 'Kreativ Website',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    dueDate: inDays(14),
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
  {
    id: 'demo-project-coverhub',
    title: 'CoverHub',
    status: 'ON_HOLD',
    priority: 'MEDIUM',
    dueDate: inDays(30),
    workspaceId: 'demo-workspace-client',
    workspace: { name: 'Client Delivery' },
  },
  {
    id: 'demo-project-crm',
    title: 'Internal CRM',
    status: 'DRAFT',
    priority: 'LOW',
    dueDate: inDays(45),
    workspaceId: 'demo-workspace-internal',
    workspace: { name: 'Internal Tools' },
  },
];

export const DEMO_ACTIVE_PROJECT_COUNT = 6;
