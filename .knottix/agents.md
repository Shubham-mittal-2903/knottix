# Knottix — AI Agent System

## Philosophy

Agents are specialized AI workers that operate within defined boundaries. Each agent has a clear domain, access scope, and output format. They are not general-purpose chatbots — they are tools with intelligence.

## Architecture

```
User Request → Agent Router → Selected Agent → Context Assembly → AI Provider → Structured Output → Memory Write
```

### Agent Router
Determines which agent handles a request based on:
1. Explicit invocation (user selects agent or uses a command)
2. Module context (request made from Projects module → project-related agents prioritized)
3. Intent classification (keyword + semantic matching, zero API cost)

### Context Assembly
Before calling the AI provider, the agent gathers:
- Its system prompt (from `lib/ai/prompts/`)
- Relevant memory entries (semantic search)
- Current module data (active project, client, etc.)
- User role (agents adjust output detail based on role)

### AI Provider
Multi-provider, routed by agent complexity:
- **Heavy reasoning** (strategy, analysis): Claude Opus / Sonnet
- **Fast tasks** (summaries, formatting): Claude Haiku
- **Fallback**: OpenAI GPT-4o, Gemini Pro (if Claude is unavailable)

Provider routing is configured per agent, not hardcoded.

## Core Agents

| Agent | Domain | Trigger | Output |
|-------|--------|---------|--------|
| **Command** | General queries, cross-module intelligence | Command palette, direct input | Structured response (text, tables, actions) |
| **Brief Writer** | Generate project briefs from client input | Projects module | Formatted brief document |
| **Task Planner** | Break down project scope into tasks | Projects module | Task list with estimates and assignments |
| **Client Intel** | Summarize client history, suggest actions | Clients module | Client intelligence report |
| **Creative Reviewer** | Analyze design assets, give feedback | Creative module | Review notes with specific feedback |
| **Finance Analyst** | Revenue analysis, expense patterns, forecasts | Finance module | Financial summary with charts data |
| **Memory Search** | Semantic search across all company knowledge | Any module | Ranked memory results with sources |
| **Report Generator** | Generate periodic reports (weekly, monthly) | Scheduled or manual | Formatted report |
| **Onboarding** | Guide new team members through the system | Team module | Step-by-step onboarding flow |

## Agent Definition Schema

Each agent is defined in `lib/ai/agents/` as:

```typescript
interface AgentDefinition {
  key: string                    // unique identifier
  name: string                   // display name
  description: string            // what this agent does
  module: string[]               // which modules can invoke it
  roles: Role[]                  // which roles can use it
  model: ModelPreference         // preferred AI model tier
  systemPrompt: (ctx) => string  // prompt builder function
  contextSources: string[]       // what data to pull (memory, project, client, etc.)
  outputSchema?: object          // structured output shape (optional)
  maxTokens: number              // response token limit
}
```

## Rules

1. **Agents cannot modify data directly.** They produce output; the application logic decides what to persist.
2. **Every agent run is logged** in the AgentRun table — input, output, model, tokens, duration.
3. **Agents respect role permissions.** A DESIGN_INTERN cannot invoke Finance Analyst.
4. **No agent has internet access.** They work only with data inside Knottix.
5. **Custom agents**: The FOUNDER can define new agents through the Agents module. Custom agents use the same schema and infrastructure.
6. **Agent chaining**: An agent can invoke another agent's output as context input. Max chain depth: 3.

## Future Agents (not for initial build)

- **Autopilot**: Scheduled agents that run without human trigger (e.g., weekly report every Monday)
- **Watcher**: Monitors for conditions and alerts (e.g., invoice overdue > 7 days)
- **Integrator**: Bridges external services (email, calendar, Slack)
