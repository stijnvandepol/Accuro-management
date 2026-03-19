function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineMarkdown(line: string) {
  return escapeHtml(line)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderTextBlock(block: string) {
  const lines = block.split("\n");
  const html: string[] = [];
  let paragraphBuffer: string[] = [];
  let unorderedListBuffer: string[] = [];
  let orderedListBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    html.push(`<p>${paragraphBuffer.map(renderInlineMarkdown).join("<br />")}</p>`);
    paragraphBuffer = [];
  }

  function flushUnorderedList() {
    if (unorderedListBuffer.length === 0) return;
    html.push(`<ul>${unorderedListBuffer.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    unorderedListBuffer = [];
  }

  function flushOrderedList() {
    if (orderedListBuffer.length === 0) return;
    html.push(`<ol>${orderedListBuffer.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
    orderedListBuffer = [];
  }

  function flushAll() {
    flushParagraph();
    flushUnorderedList();
    flushOrderedList();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushAll();
      html.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushAll();
      html.push(`<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushAll();
      html.push(`<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      flushOrderedList();
      unorderedListBuffer.push(trimmed.slice(2));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      flushUnorderedList();
      orderedListBuffer.push(trimmed.replace(/^\d+\.\s/, ""));
      continue;
    }

    flushUnorderedList();
    flushOrderedList();
    paragraphBuffer.push(trimmed);
  }

  flushAll();
  return html.join("");
}

export function renderMarkdown(markdown: string) {
  const segments = markdown.split(/```([\w-]+)?\n([\s\S]*?)```/g);
  const html: string[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    if (index % 3 === 0) {
      const textSegment = segments[index];
      if (textSegment?.trim()) {
        html.push(renderTextBlock(textSegment.trim()));
      }
      continue;
    }

    const language = segments[index] ?? "";
    const code = segments[index + 1] ?? "";
    html.push(
      `<pre><code${language ? ` data-language="${escapeHtml(language)}"` : ""}>${escapeHtml(code.trimEnd())}</code></pre>`,
    );
    index += 1;
  }

  return html.join("");
}
