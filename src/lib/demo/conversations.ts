export interface DemoConversationTurn {
  input: string;
  content: string;
  latencyMs: number;
}

/** Scripted example conversations shown pre-loaded when Demo Mode is on. */
export const DEMO_CONVERSATIONS: Record<string, DemoConversationTurn[]> = {
  'founder-executive-assistant': [
    {
      input: 'Give me an executive summary of what changed this week.',
      content:
        '**This week at a glance**\n\n- **6 active projects**, **24 open tasks** across Client Delivery, Product, and Internal Tools.\n- **ACCD Jubilee Website** is on track for launch next week — the radar globe and sponsor carousel are in final review.\n- **Judge by 4 Knotts** is blocked on a scoring-aggregation rounding bug; root cause is identified and a fix is in review.\n- **Knottix** demo prep is the top priority — visual polish shipped, database provisioning is the last step before tomorrow.\n- **Kreativ Website** and **CoverHub** are progressing normally; CoverHub remains on hold pending the client\'s budget approval.\n\nNothing is currently at risk of slipping beyond this week except the Judge scoring bug, which is actively being worked.',
      latencyMs: 1180,
    },
  ],
  'developer-ai': [
    {
      input: 'Can you review the scoring aggregation logic for the rounding bug we found?',
      content:
        'Looked at the description from the linked task. The likely issue:\n\n```\ntotal = sum(scores.map(s => Math.trunc(s * s.weight)))\n```\n\nTruncating **per-judge** before summing systematically biases the aggregate downward — small negative rounding errors compound instead of canceling out.\n\n**Fix**: sum the raw weighted scores first, then round once at the end:\n\n```\ntotal = Math.round(scores.reduce((sum, s) => sum + s.score * s.weight, 0))\n```\n\nThis preserves precision through the aggregation and only rounds the final displayed value. I\'d also add a regression test with judges weighted at 0.33/0.33/0.34 — that\'s the case most likely to expose truncation drift.',
      latencyMs: 2140,
    },
  ],
  'designer-ai': [
    {
      input: 'Review our latest design files for consistency issues.',
      content:
        'From the recent uploads across active projects, a few consistency notes:\n\n1. **Spacing drift** — the Kreativ Website hero uses 32px section padding while ACCD Jubilee uses 40px. Worth locking one scale across client sites unless the brief calls for a difference.\n2. **Button radius mismatch** — ACCD Jubilee\'s primary CTA is fully rounded (pill), Kreativ\'s is 8px. If both ship under the 4 Knotts portfolio, a shared button primitive would tighten the perceived quality.\n3. **Color contrast** — the sponsor carousel captions on ACCD Jubilee look close to WCAG AA minimum on the navy background; worth a contrast check before launch.\n\nNone of these block launch, but the spacing and radius points are quick wins if there\'s an hour before the ACCD review.',
      latencyMs: 1890,
    },
  ],
  'marketing-ai': [
    {
      input: 'Suggest three growth angles based on our current client mix.',
      content:
        'Based on the current roster (event/community, product, and creative-services clients):\n\n1. **Case-study-led outbound** — ACCD Jubilee and Judge are both distinctive, visual projects. A short case study on each, pushed to relevant founder/agency communities, positions 4 Knotts for similar high-visibility builds.\n2. **"Behind the build" content series** — short posts on how Knottix itself is being built (AI Employees, the Kernel/Runtime architecture) doubles as marketing for 4 Knotts\' technical credibility, not just design output.\n3. **Referral nudge to paused accounts** — CoverHub is on hold, not lost. A light-touch "here\'s what we shipped elsewhere this quarter" note keeps 4 Knotts top of mind for when their budget reopens.\n\nHappy to draft the first post in any of these directions.',
      latencyMs: 1520,
    },
  ],
};
