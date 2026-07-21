import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Mission Control teaser — the full Live Execution Panel (goal input, task graph, confirmation
 *  card) lives at `/goals`; this widget stays a link-out, matching the GitHub widget's own
 *  "summary card, full experience elsewhere" pattern rather than duplicating the panel inline. */
export function GoalExecutionWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-4 text-primary" />
          Goal Execution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground">
          Give Knottix a goal — it plans, executes, verifies, and retries automatically, pausing only for confirmation-gated steps.
        </p>
        <Link
          href="/goals"
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open Goal Execution
        </Link>
      </CardContent>
    </Card>
  );
}
