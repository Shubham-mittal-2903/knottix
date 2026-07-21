import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { findAIEmployee } from '@/config/ai-employees';
import { isDemoMode, DEMO_CONVERSATIONS } from '@/lib/demo';
import { AIConsole } from '@/components/modules/ai/AIConsole';
import { Orb } from '@/components/hero/Orb';

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const employee = findAIEmployee(key);
  return { title: employee?.name ?? 'AI Employee' };
}

export default async function AIEmployeeChatPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const employee = findAIEmployee(key);
  if (!employee) notFound();

  const user = await requirePermission('agents:read');
  const canExecute = user.isFounder || user.permissions.includes('agents:execute');

  return (
    <div className="hero-scope flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Orb size="lg" state="idle" wire />
          <div>
            <p className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--hero-ink-tertiary)' }}>
              {employee.role}
            </p>
            <h1 className="hero-font-display" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--hero-ink-primary)' }}>
              {employee.name}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="hero-dot hero-dot--idle" />
              <span className="hero-font-mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hero-ink-tertiary)' }}>
                idle
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="hero-font-mono" style={{ fontSize: 11, color: 'var(--hero-ink-secondary)' }}>
            {employee.recommendedModel.split(' — ')[0]}
          </span>
          <span className="text-right text-xs" style={{ color: 'var(--hero-ink-tertiary)' }}>{employee.memoryScope}</span>
        </div>
      </div>
      <AIConsole
        agentKey={employee.key}
        agentName={employee.name}
        canExecute={canExecute}
        emptyStateHint={employee.conversationStarter}
        demoMode={isDemoMode()}
        demoTranscript={DEMO_CONVERSATIONS[employee.key]}
      />
    </div>
  );
}
