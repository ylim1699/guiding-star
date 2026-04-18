# Claude Code Instructions

---

## Figma Workflow

When a Figma file, node, or URL is involved, follow this workflow before generating any code.

### Available Figma Tools

| Tool | When to use |
|------|-------------|
| `get_metadata` | Get a structural overview — layer names, node IDs, positions, sizes. Use this first to orient before diving deeper. |
| `get_design_context` | Generate UI code from a selected node. Use after identifying the correct node ID via metadata. |
| `get_screenshot` | Visually inspect a node. Use to verify what you're looking at before implementing. |
| `get_variable_defs` | Extract design tokens — colors, fonts, spacing, sizes. Always pull these before hardcoding any values. |
| `create_design_system_rules` | Generate design system rules for the repo from the current Figma file. |

### Figma → Code Workflow

1. **Orient** — Run `get_metadata` to understand the file/page structure and get node IDs.
2. **Inspect visually** — Run `get_screenshot` on the target node to confirm what you're building.
3. **Extract tokens** — Run `get_variable_defs` to get design tokens (colors, spacing, typography). Map these to CSS variables or your framework's theme — never hardcode values that exist as variables.
4. **Generate code** — Run `get_design_context` on the target node to get the full UI code output.
5. **Refine** — Apply the frontend design guidelines below to elevate beyond a raw translation.

### Node ID Format

If given a Figma URL like `https://figma.com/design/:fileKey/:fileName?node-id=1-2`, extract the node ID as `1:2` (replace `-` with `:`).

---

## Frontend Design

When building any frontend component, page, or UI — apply these principles before writing a single line of code.

### Design Thinking (do this first)

Before coding, commit to a **bold aesthetic direction**:

- **Purpose** — What problem does this interface solve? Who uses it?
- **Tone** — Pick a clear extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Differentiation** — What makes this unforgettable? What's the one thing a user will remember?
- **Constraints** — Framework, performance, accessibility requirements.

> **Rule**: Choose a conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.

---

### Aesthetic Guidelines

**Typography**
- Choose fonts that are beautiful, unique, and interesting.
- Avoid generic fonts: Arial, Inter, Roboto, system-ui, sans-serif defaults.
- Pair a distinctive display font with a refined body font.
- No convergence on overused choices like Space Grotesk, DM Sans, etc.

**Color & Theme**
- Commit to a cohesive aesthetic using CSS variables for consistency.
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- Vary between light and dark themes across builds — never default to the same scheme.
- Avoid clichéd schemes: purple gradients on white, generic blue SaaS defaults.

**Motion**
- Use animations for effects and micro-interactions.
- Prefer CSS-only for HTML; use Motion library for React when available.
- One well-orchestrated page load with staggered reveals (`animation-delay`) beats scattered micro-interactions.
- Surprise with scroll-triggered and hover state animations.

**Spatial Composition**
- Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements.
- Generous negative space OR controlled density — commit to one.

**Backgrounds & Visual Details**
- Create atmosphere and depth — never default to flat solid colors.
- Use gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays, or custom cursors where appropriate.
- Match texture to tone: grain for editorial, clean gradients for luxury, hard edges for brutalist.

---

### What to Avoid

- Generic AI aesthetics: Inter/Roboto/Arial, purple-on-white gradients, predictable card layouts.
- Cookie-cutter components that lack context-specific character.
- Designs that could belong to any project — every build should feel purpose-made.
- Hardcoding values that should be design tokens or CSS variables.

---

### Implementation Notes

- Match complexity to the vision: maximalist designs need elaborate animations; minimalist designs need restraint, precision, and careful spacing.
- Production-grade means: accessible, performant, responsive, and functional — not just pretty.
- When working from Figma output, treat `get_design_context` as a starting point — apply these guidelines to elevate it.
