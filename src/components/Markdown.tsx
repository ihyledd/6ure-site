import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkEmoji from "remark-emoji";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { slug as githubSlug } from "github-slugger";
import { CopyHeadingLink } from "@/components/CopyHeadingLink";

type Segment =
  | { type: "md"; content: string }
  | { type: "container"; kind: string; title?: string; content: string; open?: boolean };

const GH_ALERT_MAP: Record<string, string> = {
  NOTE: "info",
  TIP: "tip",
  IMPORTANT: "info",
  WARNING: "warning",
  CAUTION: "danger",
};

function stripFrontmatter(md: string): string {
  return md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function processCustomAnchors(md: string): string {
  return md.replace(
    /^(#{1,6})\s+(.+?)\s*\{#?([\w-]+)\}\s*$/gm,
    (_match, hashes: string, text: string, id: string) => {
      return `<a id="${id}" class="wiki-anchor"></a>\n\n${hashes} ${text.trim()}`;
    },
  );
}

function convertGhAlerts(md: string): string {
  return md.replace(
    /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:^>.*\n?)*)/gm,
    (_match, type: string, body: string) => {
      const kind = GH_ALERT_MAP[type] ?? "info";
      const content = body.replace(/^> ?/gm, "").trim();
      return `::: ${kind} ${type}\n${content}\n:::\n`;
    },
  );
}

function buildTocHtml(md: string): string {
  const lines = md.split("\n");
  const items: { level: number; text: string; id: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    let text = m[2]
      .replace(/\s*\{#?[\w-]+\}\s*$/, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim();
    const id = githubSlug(text);
    items.push({ level: m[1].length, text, id });
  }
  if (!items.length) return "";
  const lis = items
    .map((h) => {
      const indent = h.level === 3 ? ' style="margin-left:1rem"' : "";
      return `<li${indent}><a href="#${h.id}">${h.text}</a></li>`;
    })
    .join("\n");
  return `<ul class="wiki-inline-toc">\n${lis}\n</ul>`;
}

function processToc(md: string): string {
  if (!md.includes("[[toc]]")) return md;
  const tocHtml = buildTocHtml(md);
  return md.replace(/\[\[toc\]\]/gi, tocHtml);
}

/** Convert standalone YouTube/Vimeo URLs into embed iframes, and /video/... paths into <video> tags. */
function processVideoEmbeds(md: string): string {
  let out = md;
  // Self-hosted: a line that is only /video/filename.mp4 (or .webm, .mov, etc.)
  out = out.replace(
    /^\s*(\/video\/[a-zA-Z0-9_.-]+\.(?:mp4|webm|mov|ogg))\s*$/gm,
    (_full, path: string) =>
      `<div class="wiki-video-embed wiki-video-self-hosted"><video src="${path}" controls style="max-width:100%;width:100%"></video></div>`,
  );
  // YouTube / Vimeo
  out = out.replace(
    /^\s*(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)(?:[^\s]*)?)\s*$/gm,
    (_full, url: string, id: string) => {
      if (url.includes("youtube") || url.includes("youtu.be")) {
        const videoId = url.includes("youtu.be/") ? id : (url.match(/[?&]v=([^&]+)/)?.[1] ?? id);
        return `<div class="wiki-video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>`;
      }
      if (url.includes("vimeo.com")) {
        return `<div class="wiki-video-embed"><iframe src="https://player.vimeo.com/video/${id}" title="Vimeo video" allow="fullscreen; picture-in-picture" allowFullScreen></iframe></div>`;
      }
      return _full;
    },
  );
  return out;
}

function splitContainers(md: string): Segment[] {
  const normalized = md.replace(/\r\n/g, "\n");
  const processed = processToc(
    processVideoEmbeds(
      processCustomAnchors(convertGhAlerts(stripFrontmatter(normalized))),
    ),
  );
  const out: Segment[] = [];
  // VitePress-style: ::: type [title] [{open}]\ncontent\n:::
  // Title can contain punctuation (e.g. "Attention !"); details supports {open}
  const re =
    /^[ \t]*:::[ \t]*(\w+)(?:[ \t]+([^\n]*?))?[ \t]*\n([\s\S]*?)\n[ \t]*:::[ \t]*$/gm;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(processed)) !== null) {
    if (m.index > lastIndex) {
      out.push({
        type: "md",
        content: processed.slice(lastIndex, m.index).trimEnd(),
      });
    }
    let title = m[2]?.trim() || undefined;
    let open = false;
    if (title && /\{\s*open\s*\}$/i.test(title)) {
      open = true;
      title = title.replace(/\{\s*open\s*\}$/i, "").trim() || undefined;
    }
    out.push({
      type: "container",
      kind: m[1].toLowerCase(),
      title,
      content: m[3].trim(),
      ...(m[1].toLowerCase() === "details" && open ? { open } : {}),
    });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < processed.length) {
    out.push({
      type: "md",
      content: processed.slice(lastIndex).trimEnd(),
    });
  }
  return out.length ? out : [{ type: "md", content: processed }];
}

const remarkPlugins = [remarkGfm, remarkEmoji];
const rehypePlugins = [rehypeRaw, rehypeSlug, rehypeHighlight];

function createHeadingWithCopy(Tag: "h2" | "h3", slug: string) {
  return function HeadingWithCopy({
    node,
    children,
  }: {
    node?: { properties?: { id?: string } };
    children?: React.ReactNode;
  }) {
    const id = node?.properties?.id as string | undefined;
    return (
      <Tag id={id} className="wiki-heading-with-copy">
        <span className="wiki-heading-inner">{children}</span>
        {id && <CopyHeadingLink slug={slug} id={id} />}
      </Tag>
    );
  };
}

/** Inline markdown for FAQs, comments, descriptions: GFM + emoji + raw HTML. */
export function MarkdownProse({
  content,
  inline,
  className,
}: {
  content: string;
  inline?: boolean;
  className?: string;
}) {
  if (content == null || content === "") return null;
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={className ?? "requests-prose"}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeRaw]}
        components={
          inline
            ? {
                p: ({ children }) => <>{children}</>,
                div: ({ children }) => <>{children}</>,
                h1: ({ children }) => <strong>{children}</strong>,
                h2: ({ children }) => <strong>{children}</strong>,
                h3: ({ children }) => <strong>{children}</strong>,
                ul: ({ children }) => <span className="markdown-inline-list">{children}</span>,
                ol: ({ children }) => <span className="markdown-inline-list">{children}</span>,
                li: ({ children }) => <><span className="markdown-inline-li">{children}</span>{" "}</>,
              }
            : undefined
        }
      >
        {content}
      </ReactMarkdown>
    </Wrapper>
  );
}

type Props = {
  markdown: string;
  slug?: string;
};

export function Markdown({ markdown, slug = "" }: Props) {
  const segments = splitContainers(markdown);
  const headingComponents = slug
    ? {
        h2: createHeadingWithCopy("h2", slug),
        h3: createHeadingWithCopy("h3", slug),
      }
    : undefined;

  return (
    <div className="wiki-prose">
      {segments.map((seg, i) => {
        if (seg.type === "md") {
          if (!seg.content) return null;
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
              components={headingComponents}
            >
              {seg.content}
            </ReactMarkdown>
          );
        }
        const kind = seg.kind;
        const label =
          seg.title ||
          (kind === "tip"
            ? "TIP"
            : kind === "warning"
              ? "WARNING"
              : kind === "danger"
                ? "DANGER"
                : kind === "info"
                  ? "INFO"
                  : kind === "details"
                    ? "Details"
                    : kind.toUpperCase());

        if (kind === "details") {
          return (
            <details key={i} className="wiki-container wiki-container-details" open={seg.open}>
              <summary className="wiki-details-summary">{label}</summary>
              <div className="wiki-details-content">
                <ReactMarkdown
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={rehypePlugins}
                >
                  {seg.content}
                </ReactMarkdown>
              </div>
            </details>
          );
        }

        return (
          <div key={i} className={`wiki-container wiki-container-${kind}`}>
            <p className="wiki-container-title">{label}</p>
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              rehypePlugins={rehypePlugins}
            >
              {seg.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
