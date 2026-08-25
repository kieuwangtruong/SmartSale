/**
 * Utility for parsing and formatting AI Chatbot messages cleanly and safely.
 * Transforms markdown, bullet lists, bold/italic, callouts, and example tags into polished HTML.
 */

export function renderChatMarkdown(content: string): string {
  if (!content) return ''

  // 1. Basic HTML escaping
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Special Callouts & Example Notes (e.g., "*Thông tin ví dụ:*", "*Lưu ý:*", "*Gợi ý:*")
  html = html.replace(
    /\*+(Thông tin ví dụ|Thông tin mẫu|Ví dụ|Lưu ý|Ghi chú|Mẹo|Gợi ý|Note|Tip|Example)\*+[:：]?/gi,
    '<span class="chat-callout-badge"><span class="badge-icon">💡</span><strong>$1:</strong></span> '
  )

  // 3. Bold + Italic: ***text*** or ___text___
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')

  // 4. Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')

  // 5. Italic: *text* or _text_ (ensure it doesn't collide with bullet points at line start)
  html = html.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3')
  html = html.replace(/(^|[^_])_([^_\n]+?)_([^_]|$)/g, '$1<em>$2</em>$3')

  // 6. Inline Code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="chat-inline-code">$1</code>')

  // 7. Headings: ###, ##, #
  html = html.replace(/^###\s+(.*)$/gm, '<h5 class="chat-md-heading chat-md-h5">$1</h5>')
  html = html.replace(/^##\s+(.*)$/gm, '<h4 class="chat-md-heading chat-md-h4">$1</h4>')
  html = html.replace(/^#\s+(.*)$/gm, '<h3 class="chat-md-heading chat-md-h3">$1</h3>')

  // 8. Numbered Lists: 1. item
  html = html.replace(/^(\d+)\.\s+(.*)$/gm, '<div class="chat-list-item chat-numbered-item"><span class="item-num">$1.</span><span class="item-text">$2</span></div>')

  // 9. Bullet Lists: * item, - item, + item, • item
  html = html.replace(/^[•\-\*\+]\s+(.*)$/gm, '<div class="chat-list-item chat-bullet-item"><span class="item-bullet">•</span><span class="item-text">$1</span></div>')

  // 10. Horizontal rule: --- or ***
  html = html.replace(/^(?:---|\*\*\*|___)$/gm, '<hr class="chat-md-divider" />')

  // 11. Price formatting highlight (e.g. 150.000đ, 2.500.000 VNĐ, 50k)
  html = html.replace(
    /\b(\d{1,3}(?:\.\d{3})+)\s*(đ|₫|VNĐ|VND)\b/gi,
    '<span class="chat-price-highlight">$1&nbsp;$2</span>'
  )

  // 12. Line breaks (preserve clean spacing)
  html = html.replace(/\n\n+/g, '<div class="chat-paragraph-gap"></div>')
  html = html.replace(/\n/g, '<br/>')

  return html
}
