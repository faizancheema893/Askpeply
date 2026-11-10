# AskPeply — final Shopify theme files

This is every file we built or fixed for askpeply.com, in its final version.
Earlier drafts and mistakes are left out (old banking service templates, old Claude
worker, old Inglorious files).

## Folders
| Folder | Contents |
|---|---|
| layout/ | theme.askpeply.liquid: loads CSS/JS and renders the header, footer and Ask bar on every page |
| sections/ | 19 askpeply-* sections (header, footer, home hero, scroll story, cards, 404, Ask bar, …) |
| snippets/ | askpeply-icon (all icons including the dropdown arrow), askpeply-heading |
| assets/ | askpeply.css, askpeply.js (final versions, with footer columns, 404, dropdown and scroll story) |
| templates/ | 404, About, Contact, Services, generic service + 8 AskPeply service pages |
| cloudflare-worker/ | Gemini worker for the Ask bar. Goes on Cloudflare, NOT Shopify. The key lives in the Worker secret GEMINI_API_KEY. |

## Important
- **templates/index.json is not included on purpose.** The home page content was changed by the
  client in the Customizer; that live content only exists in Shopify. Uploading our old
  index.json would wipe it.
- The client may also have edited About, Contact and other pages in the Customizer. Uploading
  these templates replaces those edits with our defaults.
- For an exact 1:1 backup of the live store (including all Customizer content), use
  Shopify Admin › Online Store › Themes › ⋯ › **Download theme file**.

## Final versions used
- Header with the Services dropdown
- Footer with the automatic Services column (4 per column)
- Home hero with separate mobile height
- Scroll story with the mobile visual option (top / hidden), glow off by default, clean step icons
- Icon cards with automatic page links
- 404 page
- Ask bar (Gemini) section, rendered in the layout after the footer
