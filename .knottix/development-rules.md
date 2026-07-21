# Knottix — Development Rules

These rules govern how Knottix is built across every session, every prompt, every commit.

## Workflow Rules

1. **Read `.knottix/` before every implementation session.** These files are the source of truth. If the code contradicts a foundation doc, the doc wins — update the code or discuss changing the doc.

2. **Never rewrite what exists.** Modify only the files directly related to the current task. If a file works, don't touch it.

3. **Never regenerate unchanged files.** If a component, utility, or config hasn't changed, don't output it again.

4. **No placeholder code.** Every line of code must be functional. `// TODO` is allowed only with a linked task in project-status.md.

5. **No speculative features.** Build what's needed now. Not what might be needed later.

6. **One task per session.** Each development session focuses on a single module, feature, or fix. Scope creep is the enemy.

7. **Update project-status.md after every session.** Current milestone, what was built, what's next.

8. **Update decisions.md for architectural choices.** Every non-trivial decision gets logged with context and rationale.

## Code Output Rules

9. **Only output files that change.** If implementing a feature touches 3 files, output 3 files. Not 30.

10. **No markdown explanations for obvious code.** If the code is self-documenting, the code is the explanation.

11. **No tutorials.** This is a production project, not a learning exercise.

12. **No redundant comments.** Comments explain WHY, never WHAT.

## Architecture Rules

13. **No architecture changes without updating architecture.md first.** Discuss, decide, document, then implement.

14. **No new dependencies without justification.** Every npm package must solve a problem that can't be solved in under 50 lines of custom code.

15. **No folder restructuring without approval.** The directory structure in architecture.md is canonical.

16. **No duplicate components.** Before creating a new component, verify nothing similar exists.

## Quality Rules

17. **Every feature must respect permissions.md.** Role access is not optional. Not even for "we'll add it later."

18. **Every AI interaction must go through the AI engine.** No direct SDK calls outside `lib/ai/`.

19. **Every database write must be audit-logged** for entities in the audit scope.

20. **Test critical paths.** Auth flows, permission gates, financial calculations, AI routing.

## Session Protocol

Before implementation:
- Read relevant `.knottix/` docs
- Check project-status.md for current state
- Confirm the task scope

After implementation:
- Update project-status.md
- Update decisions.md if architectural choices were made
- Update roadmap.md if milestones shifted
