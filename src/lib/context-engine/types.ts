export type ContextSourceType =
  | 'memory'
  | 'knowledge'
  | 'project'
  | 'task'
  | 'meeting'
  | 'document'
  | 'github'
  | 'task-session'
  | 'workflow-history'
  | 'skill-history'
  | 'artifact'
  | 'browser'
  | 'desktop'
  | 'mcp-resource';

/** Every field here traces back to something a real collector actually read — see
 *  `collectors.ts`. There is no code path that constructs a `ContextItem` from anything other
 *  than a live query result; "never fabricate context" is enforced by construction, not by
 *  convention. */
export interface ContextItem {
  id: string;
  source: ContextSourceType;
  title: string;
  /** A short, real excerpt/summary of the item — never longer than a few hundred characters, so
   *  it's cheap to fold several into a prompt context block. */
  summary: string;
  /** Where this came from — an entity ID, a file path, a URL, whatever the source naturally has.
   *  Lets the Context Inspector link back to the real thing. */
  sourceRef: string;
  relevanceScore: number;
  freshnessScore: number;
  trustScore: number;
  /** relevanceScore*0.5 + freshnessScore*0.3 + trustScore*0.2 — see `ranking.ts`. */
  totalScore: number;
  reasonSelected: string;
  collectedAt: number;
  /** Real timestamp of the underlying item (created/updated/scheduled/etc.), when the source has
   *  one — used to compute `freshnessScore`. Null for sources with no natural timestamp (e.g. a
   *  static skill catalog entry). */
  itemTimestamp: number | null;
}

export interface ContextCollectionResult {
  query: string;
  selected: ContextItem[];
  rejected: ContextItem[];
  /** Which collectors ran and how many raw items each returned before ranking — surfaced in the
   *  Context Inspector's "Context Sources" list even for sources that contributed zero selected
   *  items, so "we checked GitHub and found nothing" reads differently from "we never checked." */
  sourcesQueried: { source: ContextSourceType; itemCount: number }[];
  collectedAt: number;
}
