import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Mission Control teaser — mirrors the Goal Execution widget's own "summary card, full
 *  experience elsewhere" pattern. Not shown in Demo Mode (Task Sessions require a real database). */
export function TaskSessionsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          Task Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">
          Give Knottix one objective and leave — it keeps working across confirmations and restarts until it's done.
        </p>
        <Link
          href="/task-sessions"
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open Task Sessions
        </Link>
      </CardContent>
    </Card>
  );
}
