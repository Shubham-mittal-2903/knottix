export interface DemoTeamMember {
  id: string;
  name: string;
  title: string;
}

/** The real 4 Knotts / Kreativ team roster — ported from the `DEFAULT_MEMBERS` fixture in the
 *  Kreativ testing site (kreativ-workspace.html), not fabricated. Replaces the placeholder demo
 *  names that were here before. */
export const DEMO_TEAM_MEMBERS: DemoTeamMember[] = [
  { id: 'shubhrat', name: 'Shubhrat Srivastava', title: 'Founder' },
  { id: 'keshav', name: 'Keshav Mathur', title: 'Creative Lead' },
  { id: 'chaitanya', name: 'Chaitanya Khanna', title: 'Designer' },
  { id: 'manik', name: 'Manik Mowdgal', title: 'Designer' },
  { id: 'shubham', name: 'Shubham Mittal', title: 'Tech Lead' },
];

export const DEMO_TEAM_MEMBER_COUNT = 5;
