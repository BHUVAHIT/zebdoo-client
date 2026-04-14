import { Fragment } from "react";

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;

const tokenizeByPattern = (nodes, pattern, mapper) =>
  nodes.flatMap((node, index) => {
    if (typeof node !== "string") {
      return [node];
    }

    const chunks = [];
    let lastIndex = 0;
    pattern.lastIndex = 0;
    let match = pattern.exec(node);

    while (match) {
      if (match.index > lastIndex) {
        chunks.push(node.slice(lastIndex, match.index));
      }

      chunks.push(mapper(match, `${index}-${match.index}`));
      lastIndex = pattern.lastIndex;
      match = pattern.exec(node);
    }

    if (lastIndex < node.length) {
      chunks.push(node.slice(lastIndex));
    }

    return chunks.length ? chunks : [node];
  });

const renderInline = (text, keyPrefix) => {
  let nodes = [text];

  nodes = tokenizeByPattern(nodes, LINK_PATTERN, (match, key) => (
    <a
      key={`${keyPrefix}-link-${key}`}
      href={match[2]}
      target="_blank"
      rel="noreferrer"
      className="community-rich-link"
    >
      {match[1]}
    </a>
  ));

  nodes = tokenizeByPattern(nodes, BOLD_PATTERN, (match, key) => (
    <strong key={`${keyPrefix}-bold-${key}`}>{match[1]}</strong>
  ));

  nodes = tokenizeByPattern(nodes, INLINE_CODE_PATTERN, (match, key) => (
    <code key={`${keyPrefix}-code-${key}`} className="community-inline-code">
      {match[1]}
    </code>
  ));

  return nodes.map((node, index) => {
    if (typeof node === "string") {
      return <Fragment key={`${keyPrefix}-text-${index}`}>{node}</Fragment>;
    }

    return node;
  });
};

export const renderCommunityMarkdown = (markdown = "", keyPrefix = "md") => {
  const source = String(markdown || "").trim();

  if (!source) {
    return [<p key={`${keyPrefix}-empty`}>No content provided.</p>];
  }

  const lines = source.split(/\r?\n/);
  const blocks = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", value: codeLines.join("\n") });
      index += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const bulletLines = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        bulletLines.push(lines[index].replace(/^\s*-\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", value: bulletLines });
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith("```") && !/^\s*-\s+/.test(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push({ type: "paragraph", value: paragraphLines.join(" ") });
  }

  return blocks.map((block, blockIndex) => {
    const blockKey = `${keyPrefix}-${block.type}-${blockIndex}`;

    if (block.type === "code") {
      return (
        <pre key={blockKey} className="community-code-block">
          <code>{block.value}</code>
        </pre>
      );
    }

    if (block.type === "list") {
      return (
        <ul key={blockKey} className="community-rich-list">
          {block.value.map((item, itemIndex) => (
            <li key={`${blockKey}-item-${itemIndex}`}>{renderInline(item, `${blockKey}-${itemIndex}`)}</li>
          ))}
        </ul>
      );
    }

    return <p key={blockKey}>{renderInline(block.value, blockKey)}</p>;
  });
};

export const formatRelativeTime = (isoDate) => {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatRoleBadge = (role) => {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "SUPER_ADMIN") return "Super Admin";
  return "Student";
};
