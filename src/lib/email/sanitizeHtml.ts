import "server-only";
import sanitizeHtml from "sanitize-html";

/** Sanitiza HTML de e-mail (recebido de terceiros ou composto no editor) antes de guardar/exibir. */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
      "ul", "ol", "li", "a", "span", "div", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "hr", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
      img: ["src", "alt", "width", "height"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-weight": [/^bold$|^\d+$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

/** Extrai um preview em texto puro (pra lista de conversas) a partir de um HTML. */
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
