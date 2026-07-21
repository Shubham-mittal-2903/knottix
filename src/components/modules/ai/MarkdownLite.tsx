import { Fragment } from 'react';

/**
 * Minimal, dependency-free markdown renderer for AI Employee responses — headers, bold,
 * inline code, fenced code blocks, and bullet/numbered lists. Not a full CommonMark parser;
 * covers what model output actually produces without adding a markdown library.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={`${keyPrefix}-${i}`} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

export function MarkdownLite({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      {blocks.map((block, blockIndex) => {
        const key = `block-${blockIndex}`;

        if (block.startsWith('```')) {
          const code = block.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '');
          return (
            <pre key={key} className="overflow-x-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-xs text-foreground">
              <code>{code}</code>
            </pre>
          );
        }

        const lines = block.split('\n');
        const isBulletList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={key} className="list-disc space-y-1 pl-5">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ''), `${key}-${i}`)}</li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={key} className="list-decimal space-y-1 pl-5">
              {lines.map((l, i) => (
                <li key={i}>{renderInline(l.replace(/^\s*\d+\.\s+/, ''), `${key}-${i}`)}</li>
              ))}
            </ol>
          );
        }

        const headingMatch = block.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const className =
            level === 1 ? 'text-base font-semibold text-foreground' : level === 2 ? 'text-sm font-semibold text-foreground' : 'text-sm font-medium text-foreground';
          return (
            <p key={key} className={className}>
              {renderInline(text, key)}
            </p>
          );
        }

        return (
          <p key={key} className="whitespace-pre-wrap">
            {renderInline(block, key)}
          </p>
        );
      })}
    </div>
  );
}
