import type { Priority, TaskStatus } from '@/types/database';
import { DEMO_PROJECTS } from './projects';

export interface DemoTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  projectId: string;
  project: { title: string };
}

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();
const inDays = (n: number) => new Date(now().getTime() + n * DAY);
const startOfToday = () => new Date(now().getFullYear(), now().getMonth(), now().getDate());

const projectByKey = (key: string) => DEMO_PROJECTS.find((p) => p.id === key)!;

function task(
  id: string,
  title: string,
  status: TaskStatus,
  priority: Priority,
  dueDate: Date | null,
  projectId: string,
): DemoTask {
  return { id, title, status, priority, dueDate, projectId, project: { title: projectByKey(projectId).title } };
}

export const DEMO_TASKS: DemoTask[] = [
  // ACCD Jubilee Website
  task('demo-task-1', 'Finalize radar globe WebGL performance pass', 'IN_PROGRESS', 'HIGH', startOfToday(), 'demo-project-accd'),
  task('demo-task-2', 'Integrate live sponsor logo carousel', 'TODO', 'MEDIUM', inDays(3), 'demo-project-accd'),
  task('demo-task-3', 'Fix mobile nav overlap on Safari', 'IN_REVIEW', 'HIGH', startOfToday(), 'demo-project-accd'),
  task('demo-task-4', 'Write launch announcement copy', 'TODO', 'MEDIUM', inDays(5), 'demo-project-accd'),
  // Judge by 4 Knotts
  task('demo-task-5', 'Code review: scoring engine refactor', 'IN_REVIEW', 'URGENT', startOfToday(), 'demo-project-judge'),
  task('demo-task-6', 'Design judge dashboard empty states', 'IN_PROGRESS', 'MEDIUM', inDays(2), 'demo-project-judge'),
  task('demo-task-7', 'Fix rounding bug in aggregate scores', 'BLOCKED', 'CRITICAL', startOfToday(), 'demo-project-judge'),
  task('demo-task-8', 'Draft judge onboarding email sequence', 'TODO', 'LOW', inDays(6), 'demo-project-judge'),
  // Knottix
  task('demo-task-9', 'Wire real database for demo readiness', 'IN_PROGRESS', 'CRITICAL', startOfToday(), 'demo-project-knottix'),
  task('demo-task-10', 'QA pass on AI Directory across breakpoints', 'TODO', 'HIGH', inDays(1), 'demo-project-knottix'),
  task('demo-task-11', 'Add OpenAI provider adapter', 'TODO', 'MEDIUM', inDays(10), 'demo-project-knottix'),
  task('demo-task-12', 'Design onboarding tour for new founders', 'TODO', 'MEDIUM', inDays(12), 'demo-project-knottix'),
  task('demo-task-13', 'Load-test Anthropic streaming under concurrency', 'IN_PROGRESS', 'HIGH', inDays(4), 'demo-project-knottix'),
  task('demo-task-14', 'Write architecture decision record for RBAC v2', 'TODO', 'LOW', inDays(15), 'demo-project-knottix'),
  // Kreativ Website
  task('demo-task-15', 'Build case-study template in CMS', 'IN_PROGRESS', 'MEDIUM', inDays(3), 'demo-project-kreativ'),
  task('demo-task-16', 'Shoot and edit hero reel', 'TODO', 'MEDIUM', inDays(8), 'demo-project-kreativ'),
  task('demo-task-17', 'SEO audit on existing landing pages', 'TODO', 'LOW', inDays(9), 'demo-project-kreativ'),
  task('demo-task-18', 'A/B test new contact form layout', 'TODO', 'LOW', inDays(11), 'demo-project-kreativ'),
  // CoverHub
  task('demo-task-19', 'Resume design system audit after client hold', 'TODO', 'LOW', inDays(20), 'demo-project-coverhub'),
  task('demo-task-20', 'Prepare resumption proposal for client sign-off', 'TODO', 'MEDIUM', inDays(7), 'demo-project-coverhub'),
  // Internal CRM
  task('demo-task-21', 'Define client pipeline stages', 'TODO', 'MEDIUM', inDays(14), 'demo-project-crm'),
  task('demo-task-22', 'Wireframe deal-board kanban view', 'TODO', 'LOW', inDays(16), 'demo-project-crm'),
  task('demo-task-23', 'Evaluate email-sync approach', 'TODO', 'LOW', inDays(18), 'demo-project-crm'),
  task('demo-task-24', 'Draft data model for client interactions', 'TODO', 'MEDIUM', inDays(13), 'demo-project-crm'),
];

export const DEMO_OPEN_TASK_COUNT = 24;
