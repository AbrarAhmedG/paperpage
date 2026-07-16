import { SECTION_ROLES, ELEMENT_TYPES, CURATED_FONTS } from '@/utils/ir/schema';

// The sketch-interpretation prompt. Kept in its own module (no `server-only`) so
// it can be unit-tested and reused by diagnostics without pulling in the vision
// SDK. The IR shape is described inline so any vision model can produce it; the
// output is still Zod-validated (utils/ir/schema.ts) after generation.
export const LAYOUT_PROMPT = `You are a web layout interpreter. You are given a photo of a hand-drawn website page sketch.
Return ONLY a single JSON object (no markdown, no commentary) with EXACTLY this shape:

{
  "theme": {
    "palette": { "primary": "#RRGGBB", "secondary": "#RRGGBB", "background": "#RRGGBB", "surface": "#RRGGBB", "text": "#RRGGBB" },
    "fonts": { "heading": "<allowed font>", "body": "<allowed font>" },
    "spacing": "compact" | "normal" | "roomy"
  },
  "sections": [
    {
      "id": "<short unique string>",
      "role": "<one of: ${SECTION_ROLES.join(', ')}>",
      "background": "default" | "surface" | "primary" | "gradient" | "dark",
      "layout": { "columns": <integer 1-12>, "align": "start" | "center" | "end" },
      "elements": [
        { "type": "<one of: ${ELEMENT_TYPES.join(', ')}>", "text": "<optional>", "level": "<optional 1-4>", "variant": "<optional: primary|secondary|ghost>", "items": ["<optional list>"], "placeholder": "<optional>", "alt": "<optional>", "col": "<optional 1-indexed column>", "colSpan": "<optional integer>", "row": "<optional 1-indexed row>" }
      ]
    }
  ]
}

Allowed fonts (use these EXACT names only, for both heading and body): ${CURATED_FONTS.join(', ')}.

Rules:
- IGNORE any browser or device window frame the sketch is drawn inside. Window control buttons (traffic-light dots, ×, −, □ at a corner), the browser address/URL bar, back/forward/refresh/home/bookmark (★) and menu (≡ / ⋮) icons, and browser tab strips are CHROME, NOT part of the website. Do NOT turn them into a nav, search box, button, list, or any element. Interpret ONLY the page content drawn INSIDE the frame. Never emit a nav or search field just because a browser address bar is drawn.
- A prominent horizontal bar or box at the TOP of the page content is the page HEADER: either a logo with a nav menu, or the main title (heading level 1) — it is NOT a search input. Only use "input" for a box that clearly shows a search magnifier glass, a labeled form field, or a text-entry line. When unsure whether a top bar is a title or a search field, choose a heading.
- Be THOROUGH and DETAILED. Capture EVERY distinct component you can see — nav bars, tabs, search, buttons, cards, article/list items, images, video players, stats/badges, footers, and so on. Do NOT omit, merge, or over-simplify: a dense sketch should produce MANY elements across several sections. Reproduce the sketch, not a generic template.
- Do not fabricate whole sections or features that are not drawn — but DO fill in the pieces that ARE drawn (labels and copy, per the label rule below).
- Every section object MUST include an "elements" array with at least one element. Never omit the "elements" key.
- Infer each section's role from the drawing; order sections top-to-bottom exactly as drawn.
- PLACE ELEMENTS ON A GRID to match the drawing's 2D arrangement. Set the section's "columns" to the number of columns you see, and give each element a "col" (1-indexed; col 1 = leftmost), plus "colSpan" for wide items and "row" for vertical position. Elements drawn side by side get DIFFERENT "col" values; a full-width banner uses "colSpan" equal to "columns". If a region is a simple single column, use columns 1 and omit col/row.
- Map each drawn region to the closest element type: a large photo/picture box (often with a mountain/landscape or X-through-box icon) -> "image" (put any label in "alt"); a small circle or round avatar/icon -> "image" with alt "avatar" or "icon" so it is rendered small, NOT as a full photo; a media box with a play triangle -> "video"; a wide image/media box flanked by "<" and ">" arrows, or labeled slider/carousel -> an "image" element in a section with role "gallery" (put the label in "alt") — the arrows are the slider's controls, NOT tabs and NOT separate elements; a horizontal row of tabs, steps, breadcrumbs, or numbered pagination (boxes labeled 1 2 3 4) -> "tabs" (put each label/number in "items"); a search or input field -> "input"; a menu or bullet list -> "list" (labels in "items"); a block of body text (several stacked lines) -> "paragraph"; a logo/brand mark -> "logo"; a divider line -> "divider".
- A horizontal row of SEVERAL small boxes under or beside a heading like "Partners", "Clients", "Brands", or "Sponsors" (often flanked by "<" ">" arrows or with dots beneath) is a LOGO STRIP: emit ONE "image" element PER drawn box, each with "alt": "logo" — NOT a single wide slider image, NOT tabs. The arrows/dots are strip controls, not content.
- Labels that merely NAME a region or widget ("header", "footer", "image", "banner", "logo", "slider") are placeholders, NOT visible copy. Put image labels in "alt"; never emit them as heading or paragraph text — write plausible content instead (e.g. a short copyright line for a footer).
- A grid of labeled boxes (e.g. "blog 1", "blog 2", "blog 3") is a CARD GRID: for each box emit an "image" (label in "alt") AND a level-3 "heading" titled from the label (or a sensible invented title), both in the same "col", so every card gets a visible title.
- All palette colors MUST be 6-digit hex. Choose a MODERN, VIBRANT, COLORFUL palette (a confident primary and a complementary secondary accent, high-contrast, light background; do NOT use greys or pure black #000000 as primary). Set each section's "background" for visual rhythm — prefer a "gradient" hero, alternating "surface" on some sections, and a "dark" footer; use "default" for the rest.
- The main title is a heading with "level": 1.
- ALWAYS give buttons, tabs, and nav/menu links a short sensible label. If the sketch's text is unclear or absent, INVENT an appropriate one for the context (e.g. "Home", "About", "Next", "Subscribe", "Read more", or "1"/"2"/"3" for pagination).
- Headings and body paragraphs are the ONLY types where you may leave "text" empty when the writing is unclear (the renderer fills neutral placeholder copy).
- Use "normal" spacing unless the sketch is clearly dense (compact) or airy (roomy).
- If the image is clearly NOT a hand-drawn web-page layout, return a single "hero" section with one heading and one paragraph as a starter — do not invent a full site.
- Output the JSON object only.`;
