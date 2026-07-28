<!-- BEGIN:talkinbio-brand-rules -->
# Talkinbio Brand & UI Guidelines

For all future UI changes, new pages, and component designs in this repository, you MUST adhere strictly to the following brand guidelines extracted from the main landing page:

1. **Colors**:
   - **Primary Palette**: 
     - `#FF6A5C` (Coral / Orange) - Saule accent
     - `#14231F` (Ink / Dark Green-Black) - Main text, dark backgrounds
     - `#F4F2ED` (Paper / Cream) - Main light background
     - `#38F9D7` (Neon Green) - Beiwe accent
   - Backgrounds: Use `#F4F2ED` (Paper) for main backgrounds, `#FFFFFF` for elevated cards.
   - Text: Use `#14231F` (Ink) for primary text/headings, `#4B5A55` (Ink Soft) for secondary text, and `#8A8880` (Muted) for placeholders/passive text.
   - Accent: Use `#FF6A5C` (Coral) for primary actions/highlights/Saule, `#FFEDE9` (Coral Tint) for light accent backgrounds, `#38F9D7` (Neon Green) for Beiwe highlights, and `#2B6F5C` (Teal) for secondary highlights (like eyebrow text).
   - Borders: Use `rgba(20,35,31,0.10)`.

2. **Typography**:
   - Headings (h1, h2, h3): Must use `'Bricolage Grotesque', sans-serif`, weight `800`, letter-spacing `-0.02em`.
   - Body/Forms/Buttons: Must use `'Inter', sans-serif`, weights `400, 500, 600, 700`.
   - Mono/Labels/Eyebrows: Must use `'IBM Plex Mono', monospace`.

3. **Geometry & Shape**:
   - Border Radius: Large elements/cards use `20px`. Buttons MUST be pill-shaped (`100px`).
   - Shadows: Only use shadows for highly elevated floating elements (like phone mockups). Use borders (`0.5px solid var(--border)`) for normal cards.
   - Transitions: Keep them subtle and short (e.g., `transform .15s ease, opacity .15s`).

Do not use default Tailwind colors (like `bg-blue-500` or `text-gray-700`) if they conflict with the brand palette. Map Tailwind config to these exact hex codes if building new Tailwind components.
<!-- END:talkinbio-brand-rules -->
