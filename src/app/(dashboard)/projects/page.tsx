import type { Metadata } from 'next';
import { CalendarClock, FolderKanban, Layers } from 'lucide-react';
import { requireAuth } from '@/lib/auth/session';
import { listProjectsForOrganization, listProjectsForWorkspace } from '@/lib/db/queries/project';
import { isDemoMode, DEMO_PROJECTS } from '@/lib/demo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/modules/shared/EmptyState';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';
import type { Priority, ProjectStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Projects' };

const STATUS_VARIANT: Record<ProjectStatus, 'default' | 'accent' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  ACTIVE: 'accent',
  ON_HOLD: 'warning',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'default',
  CANCELLED: 'error',
};

const PRIORITY_VARIANT: Record<Priority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'error',
  CRITICAL: 'error',
};

const CARD_GRADIENTS = [
  'from-indigo-500/20 to-violet-500/5',
  'from-sky-500/20 to-indigo-500/5',
  'from-emerald-500/20 to-teal-500/5',
  'from-fuchsia-500/20 to-pink-500/5',
  'from-amber-500/20 to-orange-500/5',
  'from-cyan-500/20 to-blue-500/5',
];

export default async function ProjectsPage() {
  const user = await requireAuth();
  const demo = isDemoMode();

  const projects = demo
    ? DEMO_PROJECTS
    : user.isFounder
      ? await listProjectsForOrganization(user.organizationId, 100)
      : user.workspaceId
        ? await listProjectsForWorkspace(user.workspaceId, 100)
        : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={user.isFounder ? 'Every project across the organization.' : 'Projects in your workspace.'}
      />

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Projects created in this workspace will appear here." />
      ) : (
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <RevealItem key={project.id}>
              <Card className="card-hover h-full overflow-hidden">
                <CardHeader className="relative">
                  <div
                    className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-primary">
                      <FolderKanban className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">{project.title}</CardTitle>
                      {'workspace' in project && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="size-3" />
                          {project.workspace.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={STATUS_VARIANT[project.status]}>{project.status.replace('_', ' ')}</Badge>
                    <Badge variant={PRIORITY_VARIANT[project.priority]}>{project.priority}</Badge>
                  </div>
                  {project.dueDate && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      Due {formatDate(project.dueDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
