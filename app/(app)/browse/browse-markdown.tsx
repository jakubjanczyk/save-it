"use client";

import type { ReactNode } from "react";

const INLINE_CODE_RE = /`([^`]+)`/;
const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/;
const INLINE_BOLD_RE = /\*\*([^*]+)\*\*/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const HEADING_START_RE = /^(#{1,3})\s+/;
const UL_ITEM_RE = /^\s*[-*]\s+/;
const OL_ITEM_RE = /^\s*\d+\.\s+/;
const UL_STRIP_RE = /^\s*[-*]\s+/;
const OL_STRIP_RE = /^\s*\d+\.\s+/;

function safeUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

interface InlineMatch {
  full: string;
  index: number;
  match: RegExpMatchArray;
  type: "code" | "link" | "bold";
}

function findInlineMatch(
  text: string,
  type: InlineMatch["type"],
  re: RegExp
): InlineMatch | null {
  const match = text.match(re);
  if (!match) {
    return null;
  }
  const index = match.index ?? 0;
  const full = match[0] ?? "";
  return { full, index, match, type };
}

function findNextInlineMatch(text: string): InlineMatch | null {
  const candidates = [
    findInlineMatch(text, "code", INLINE_CODE_RE),
    findInlineMatch(text, "link", INLINE_LINK_RE),
    findInlineMatch(text, "bold", INLINE_BOLD_RE),
  ].filter(Boolean) as InlineMatch[];

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) =>
    current.index < best.index ? current : best
  );
}

function renderInlineMatch(next: InlineMatch, key: number): ReactNode {
  if (next.type === "code") {
    return (
      <code className="rounded bg-muted px-1 py-0.5 text-xs" key={key}>
        {next.match[1]}
      </code>
    );
  }

  if (next.type === "bold") {
    return <strong key={key}>{next.match[1]}</strong>;
  }

  const label = next.match[1] ?? "";
  const href = next.match[2] ?? "";
  const safe = safeUrl(href);
  if (!safe) {
    return label;
  }

  return (
    <a
      className="underline underline-offset-2"
      href={safe}
      key={key}
      rel="noreferrer noopener"
      target="_blank"
    >
      {label}
    </a>
  );
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Minimal inline markdown: `code`, **bold**, [text](url)
  // We intentionally ignore raw HTML.
  while (remaining.length > 0) {
    const next = findNextInlineMatch(remaining);
    if (!next) {
      nodes.push(remaining);
      break;
    }

    if (next.index > 0) {
      nodes.push(remaining.slice(0, next.index));
    }

    nodes.push(renderInlineMatch(next, key++));
    remaining = remaining.slice(next.index + next.full.length);
  }

  return nodes;
}

function renderParagraph(text: string, key: number) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed" key={key}>
      {parseInline(text)}
    </p>
  );
}

function renderCodeBlock(code: string, key: number) {
  return (
    <pre
      className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed"
      key={key}
    >
      <code>{code}</code>
    </pre>
  );
}

export function BrowseMarkdown(props: { markdown: string }) {
  const lines = props.markdown.replace(/\r/g, "").split("\n");
  return <div className="grid gap-3">{renderBlocks(lines)}</div>;
}

function isBlank(line: string) {
  return line.trim() === "";
}

function isFence(line: string) {
  return line.trim().startsWith("```");
}

function parseFence(lines: string[], startIndex: number) {
  let i = startIndex + 1;
  const codeLines: string[] = [];
  while (i < lines.length && !isFence(lines[i] ?? "")) {
    codeLines.push(lines[i] ?? "");
    i += 1;
  }
  return {
    nextIndex: i + 1,
    node: renderCodeBlock(codeLines.join("\n").trimEnd(), startIndex),
  };
}

function parseHeading(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const match = line.match(HEADING_RE);
  if (!match) {
    return null;
  }

  const level = match[1]?.length ?? 1;
  const text = match[2] ?? "";
  let className = "text-sm font-medium";
  if (level === 1) {
    className = "text-base font-semibold";
  } else if (level === 2) {
    className = "text-sm font-semibold";
  }

  return {
    nextIndex: index + 1,
    node: (
      <div className={className} key={`h:${index}`}>
        {parseInline(text)}
      </div>
    ),
  };
}

function isListItem(line: string) {
  return UL_ITEM_RE.test(line) || OL_ITEM_RE.test(line);
}

function isOrderedItem(line: string) {
  return OL_ITEM_RE.test(line);
}

function isListItemForType(line: string, ordered: boolean) {
  return ordered ? isOrderedItem(line) : UL_ITEM_RE.test(line);
}

function stripListMarker(line: string, ordered: boolean) {
  return ordered
    ? line.replace(OL_STRIP_RE, "")
    : line.replace(UL_STRIP_RE, "");
}

function skipBlankLinesInList(
  lines: string[],
  index: number,
  ordered: boolean
) {
  let i = index;
  while (i < lines.length && isBlank(lines[i] ?? "")) {
    i += 1;
  }

  if (i >= lines.length) {
    return null;
  }

  const next = lines[i] ?? "";
  if (!isListItemForType(next, ordered)) {
    return null;
  }

  return i;
}

function parseList(lines: string[], startIndex: number) {
  const first = lines[startIndex] ?? "";
  if (!isListItem(first)) {
    return null;
  }

  const ordered = isOrderedItem(first);
  const items: ReactNode[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const current = lines[i] ?? "";
    if (isBlank(current)) {
      const nextIndex = skipBlankLinesInList(lines, i, ordered);
      if (nextIndex !== null) {
        i = nextIndex;
        continue;
      }
      break;
    }

    if (!isListItemForType(current, ordered)) {
      break;
    }

    const content = stripListMarker(current, ordered);
    items.push(<li key={items.length}>{parseInline(content)}</li>);
    i += 1;
  }

  const ListTag = ordered ? "ol" : "ul";
  return {
    nextIndex: i,
    node: (
      <ListTag
        className={
          ordered
            ? "list-inside list-decimal space-y-1 text-sm leading-relaxed"
            : "list-inside list-disc space-y-1 text-sm leading-relaxed"
        }
        key={`l:${startIndex}`}
      >
        {items}
      </ListTag>
    ),
  };
}

function isParagraphBoundary(line: string) {
  if (isBlank(line)) {
    return true;
  }
  if (isFence(line)) {
    return true;
  }
  if (HEADING_START_RE.test(line)) {
    return true;
  }
  return isListItem(line);
}

function parseParagraph(lines: string[], startIndex: number) {
  const paragraphLines: string[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const current = lines[i] ?? "";
    if (isParagraphBoundary(current)) {
      break;
    }
    paragraphLines.push(current);
    i += 1;
  }

  return {
    nextIndex: i,
    node: renderParagraph(paragraphLines.join("\n"), startIndex),
  };
}

function renderBlocks(lines: string[]) {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (isBlank(line)) {
      i += 1;
      continue;
    }

    if (isFence(line)) {
      const { nextIndex, node } = parseFence(lines, i);
      nodes.push(node);
      i = nextIndex;
      continue;
    }

    const heading = parseHeading(lines, i);
    if (heading) {
      nodes.push(heading.node);
      i = heading.nextIndex;
      continue;
    }

    const list = parseList(lines, i);
    if (list) {
      nodes.push(list.node);
      i = list.nextIndex;
      continue;
    }

    const paragraph = parseParagraph(lines, i);
    nodes.push(paragraph.node);
    i = paragraph.nextIndex;
  }

  return nodes;
}
