# Studio Poetics Fabrication Lab — Project Status

> Last updated: 2026-06-02

## What This Is

Svelte 5 + TypeScript + Vite 6 multi-module parametric fabrication platform for laser-cut design. Deployed to GitHub Pages. Built in-place replacing a vanilla JS BoxMaker at `/BoxMaker/`.

Dev server: `npm run dev` → localhost:5173  
Build: `npm run build` → `dist/` (GitHub Pages ready, `base: './'`)

---

## Tech Stack

| Tool | Version | Notes |
|------|---------|-------|
| Svelte | 5.x | Runes API only (`$state`, `$derived`, `$derived.by`, `$effect`) |
| Vite | 6.4.3 | `@sveltejs/vite-plugin-svelte@6.2.4` required for Vite 6 compat |
| TypeScript | strict | `moduleResolution: "bundler"`, `allowImportingTsExtensions: true` |
| Three.js | 0.171.0 | Lazy-loaded (separate 475KB chunk, only loads on ASSEMBLED tab) |
| @dromney/gear-gen | 0.2.11 | Involute spur gear library — `Gear` class |

Path aliases: `$core`, `$modules`, `$stores`, `$lib`

---

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| BOX | Complete | All 6 types, SVG+DXF export, full design system |
| GEARS | Complete (Phase 3 MVP) | @dromney/gear-gen, animated preview, SVG+DXF export |
| HINGES | Locked placeholder | Phase 4 |
| ENCLOSURES | Locked placeholder | Phase 5 |
| KINETIC | Locked placeholder | Phase 6 |

View modes: FLAT (box layout), ASSEMBLED (Three.js 3D), SIMULATION (locked placeholder)

---

## Source File Map

```
src/
  main.ts                        — mount(App, { target: #app })
  app.css                        — full design system (CSS vars, all component styles)
  App.svelte                     — toolbar + module picker + 3-panel shell + lazy AssemblyView

  core/
    types.ts                     — Vec2, Panel, EdgeSpec, LayoutResult, Warning, PanelPlacement
    geometry/
      joints.ts                  — panelPoints(), pointsToPath(), hingeLines(), grooveLines()
      layout.ts                  — layoutPanels(panels, t) → { placements, totalW, totalH }
    fabrication/
      validation.ts              — validate(params) → Warning[], isValid(warnings)
    exporters/
      svg.ts                     — generateSVG(), downloadSVG()
      dxf.ts                     — generateDXF(), downloadDXF() — DXF R12, 1unit=1mm

  modules/
    boxes/
      types.ts                   — BoxParams, BoxType, DEFAULT_PARAMS, BOX_TYPE_DEFS
      generator.ts               — generate(params): Panel[] — all 6 box types
    gears/
      types.ts                   — GearParams {N1,N2,module,PADeg,holeD,thickness}, DEFAULT_GEAR_PARAMS

  stores/
    fabrication.svelte.ts        — class FabStore { params=$state, panels=$derived, warnings=$derived }; export const fab
    gears.svelte.ts              — class GearStore { params=$state, gears=$derived.by }; export const gearFab

  lib/
    components/
      NumInput.svelte            — precision number input + ▲▼ steppers, $bindable value
      SegControl.svelte          — segmented switch
      Slider.svelte              — precision range slider
    workspace/
      FabricationView.svelte     — declarative SVG, ResizeObserver, scroll zoom, drag pan
      AssemblyView.svelte        — Three.js 3D, lazy-loaded, non-overlapping panels
      GearView.svelte            — animated involute gear pair, @dromney/gear-gen rendering
    panels/
      LeftPanel.svelte           — box controls (type grid, dimensions, material, kerf, joints)
      RightPanel.svelte          — readouts, stats, warnings, SVG+DXF export
      GearLeftPanel.svelte       — gear controls (N1, N2, module, pressure angle, bore, thickness)
      GearRightPanel.svelte      — pair stats, per-gear SVG+DXF export buttons
```

---

## Design System (app.css)

**Fonts:** IBM Plex Sans (UI) + IBM Plex Mono (all numbers, labels, readouts)  
**Colors:**
- `--white #F6F5F3` · `--black #0C0C0B`
- Greys: `--g50 #EDECE9` · `--g100 #E8E7E4` · `--g200 #E2E1DC` · `--g400 #CCCBC7` · `--g600 #AEADA9` · `--g800 #86857F`
- `--orange #E85D04` (active/accent) · `--green #1A7A3F` · `--red #D0190C`

**Layout:** `48px toolbar + 1fr main` · main = `260px | 1fr | 260px`  
**Panel fills (tints):** `['#F6F5F3','#EDECE9','#E8E7E4','#E2E1DC','#DDD8CF']`

---

## Gear Module (@dromney/gear-gen) — Key API

```ts
// scale:1 makes D in mm when you set D = N * module
const g1 = new Gear({ N: 20, D: 60, PADeg: 20, scale: 1, jointAngleDeg: 0 });
const g2 = new Gear({ N: 12, parent: g1, jointAngleDeg: 0 });
// Constructor calls updateStatic() automatically

// Dimensions (mm since scale=1):
g1.r          // pitch radius = D/2
g1.rOuter     // addendum radius = (N+2)*m/2
g1.dOuter     // addendum diameter = (N+2)*m
g1.dInner     // dedendum diameter

// Animation — call g1 BEFORE g2 (g2.getRot reads g1.rot):
g1.getRot(angle);   // sets g1.rot, returns it
g2.getRot(angle);   // uses parent g1.rot internally

// Rendering:
g1.pointsLinear     // [{x,y}] tooth profile in mm (centered at 0,0)

// Export (DXF uses dsc=1, already in mm):
g1.downloadDXF()    // browser download, mm units
// For SVG: generate manually with width/height in mm (see GearRightPanel.svelte)
```

**Bore hole in SVG:** append circle subpath + `fill-rule="evenodd"`:
```
M{r},0 A{r},{r} 0 1,0 -{r},0 A{r},{r} 0 1,0 {r},0 Z
```

**Rotation math:** `g1.rot = angle`, `g2.rot = 180 - (N1/N2)*angle` (exact mesh)

---

## Svelte 5 Patterns Used

```ts
// Store — reactive class (required to export $derived values)
class FabStore {
  params   = $state<BoxParams>({ ...DEFAULT_PARAMS });
  panels   = $derived<Panel[]>(generate(this.params));
  gears    = $derived.by(() => { ... return { g1, g2 }; });
  update(p) { Object.assign(this.params, p); }
}
export const fab = new FabStore();

// Multi-step derived (use $derived.by, not $derived for function bodies)
const baseScale = $derived.by(() => {
  const avW = cw - MARGIN * 2;
  return Math.min(avW / layout.totalW, avH / layout.totalH, 3);
});

// Ordered derived (when mutation order matters):
const rots = $derived.by(() => {
  g1.getRot(angle);
  g2.getRot(angle);
  return [g1.rot, g2.rot] as [number, number];
});
```

**Gotchas:**
- `$derived(() => fn)` stores the function, not its return value — use `$derived.by()`
- Cannot `export const x = $derived(...)` at module top level → use reactive class
- `let isDragging = $state(false)` not `let isDragging = false` (avoid non-reactive update warnings)

---

## Known Pending Work

- [ ] Gear module: add more gear types (internal gear, rack-and-pinion via `RackAndPinion` export)
- [ ] Gear module: gear train (multiple meshing gears)
- [ ] Gear module: animation speed control
- [ ] Assembly view: support all 6 box types properly (currently closedBox-centric geometry)
- [ ] Box module: kerf compensation in path generation
- [ ] Phase 4: Living hinge generator
- [ ] Phase 5: Electronics enclosures
- [ ] Phase 6: Kinetic builder
- [ ] GitHub Pages deployment (add `gh-pages` script to package.json)
