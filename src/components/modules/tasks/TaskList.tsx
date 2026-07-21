import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Priority, TaskStatus } from '@/types/database';

export interface TaskListItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  project?: { title: string } | null;
}

const STATUS_VARIANT: Record<TaskStatus, 'default' | 'accent' | 'success' | 'warning' | 'error'> = {
  TODO: 'default',
  IN_PROGRESS: 'accent',
  IN_REVIEW: 'warning',
  BLOCKED: 'error',
  DONE: 'success',
  CANCELLED: 'default',
};

const PRIORITY_VARIANT: Record<Priority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'error',
  CRITICAL: 'error',
};

export function TaskList({ tasks, showProject = false }: { tasks: TaskListItem[]; showProject?: boolean }) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No tasks here.</p>;
  }

  return (
    <ul className="divide-y divide-border/70">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/30"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
            {showProject && task.project && (
              <p className="truncate text-xs text-muted-foreground">{task.project.title}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {task.dueDate && <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>}
            <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
            <Badge variant={STATUS_VARIANT[task.status]}>{task.status.replace('_', ' ')}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
