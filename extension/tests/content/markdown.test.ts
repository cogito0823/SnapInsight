import test from "node:test";
import assert from "node:assert/strict";

import { renderMarkdownToHtml } from "../../src/content/ui/markdown";

test("renderMarkdownToHtml renders headings, lists, separators, and inline styles", () => {
  const html = renderMarkdownToHtml(`# 标题

## 小节

- 第一项
- **第二项**

1. 步骤一
2. 步骤二

---

这是包含 *强调* 与 \`code\` 的段落。`);

  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<h2>小节<\/h2>/);
  assert.match(html, /<ul><li>第一项<\/li><li><strong>第二项<\/strong><\/li><\/ul>/);
  assert.match(html, /<ol><li>步骤一<\/li><li>步骤二<\/li><\/ol>/);
  assert.match(html, /<hr \/>/);
  assert.match(html, /<p>这是包含 <em>强调<\/em> 与 <code>code<\/code> 的段落。<\/p>/);
});

test("renderMarkdownToHtml escapes raw html", () => {
  const html = renderMarkdownToHtml(`<script>alert("xss")</script>`);

  assert.equal(
    html,
    "<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>"
  );
});
