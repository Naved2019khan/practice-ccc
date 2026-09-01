/**
 * Dependency-free HTML sanitizer for trusted-but-untrusted itinerary markup
 * pasted from external converters (e.g. pnrconverter.com).
 *
 * This is intentionally conservative: it removes anything that can execute
 * script or exfiltrate data while leaving presentational markup (tables,
 * inline styles, images) intact. It runs in both Node (API routes) and the
 * browser, so it uses regex rather than the DOM.
 *
 * NOTE: Regex-based sanitization is not a substitute for a full HTML parser
 * for hostile public input. Here the source is an internal staff member
 * pasting a converter's output, so the threat model is limited to a bad paste
 * rather than an attacker-controlled string.
 */

/** Tags whose entire content is dropped (open tag → close tag). */
const DANGEROUS_BLOCKS = [
  'script',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'link',
  'meta',
  'base',
  'form',
];

/**
 * Keep <style> blocks (converters like pnrconverter.com rely on them for
 * layout) but scrub anything unsafe from their CSS: @import, expression(),
 * and javascript:/vbscript: urls.
 */
function sanitizeStyleBlocks(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
    let clean = String(css);
    clean = clean.replace(/@import[^;]+;?/gi, '');
    clean = clean.replace(/expression\s*\(/gi, '');
    clean = clean.replace(/url\s*\(\s*(?:'|")?\s*(?:javascript|vbscript):[^)]*\)/gi, '');
    return `<style>${clean}</style>`;
  });
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  let html = String(input);

  // Preserve but scrub <style> blocks before the block-stripping pass.
  html = sanitizeStyleBlocks(html);

  // Strip dangerous block elements along with their contents.
  for (const tag of DANGEROUS_BLOCKS) {
    // <tag ...> ... </tag>
    const withContent = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi');
    html = html.replace(withContent, '');
    // Any dangling / self-closing occurrences of the tag.
    const dangling = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    html = html.replace(dangling, '');
  }

  // Remove inline event handlers: on*="..." / on*='...' / on*=value
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  // Neutralize javascript:/vbscript: and non-image data: URLs in href/src/style.
  // We allow data:image/ (e.g. data:image/png;base64,...) so airline logos/icons pasted from PNR converters are preserved.
  html = html.replace(
    /(href|src|xlink:href)\s*=\s*"(?:\s*)(?:javascript|vbscript|data(?!\s*:\s*image\/)):[^"]*"/gi,
    '$1="#"'
  );
  html = html.replace(
    /(href|src|xlink:href)\s*=\s*'(?:\s*)(?:javascript|vbscript|data(?!\s*:\s*image\/)):[^']*'/gi,
    "$1='#'"
  );

  // Remove CSS expression()/url(javascript:) and @import from inline styles.
  html = html.replace(/expression\s*\(/gi, '');
  html = html.replace(/url\s*\(\s*(?:'|")?\s*(?:javascript|vbscript):[^)]*\)/gi, '');
  html = html.replace(/@import[^;]+;?/gi, '');

  return html.trim();
}
