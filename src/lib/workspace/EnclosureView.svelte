<script lang="ts">
  import { onMount } from 'svelte';
  import { encFab } from '$stores/enclosures.svelte';
  import { CUTOUT_DIMS } from '$modules/enclosures/types';
  import { cutoutPath } from '$modules/enclosures/generator';
  import { panelPoints, pointsToPath } from '$core/geometry/joints';
  import type { Cutout } from '$modules/enclosures/types';

  let container: HTMLDivElement;
  let cw = $state(800);
  let ch = $state(600);

  onMount(() => {
    const ro = new ResizeObserver(e => {
      cw = e[0].contentRect.width;
      ch = e[0].contentRect.height;
    });
    ro.observe(container);
    cw = container.clientWidth;
    ch = container.clientHeight;
    return () => ro.disconnect();
  });

  const panel = $derived(encFab.currentPanel);
  const p     = $derived(encFab.params);

  const MARGIN = 48;

  // Tab extension on each side (only when fingerJoints=true)
  const tabL = $derived(p.fingerJoints && panel.edges?.L === 'f' ? p.thickness : 0);
  const tabR = $derived(p.fingerJoints && panel.edges?.R === 'f' ? p.thickness : 0);
  const tabT = $derived(p.fingerJoints && panel.edges?.T === 'f' ? p.thickness : 0);
  const tabB = $derived(p.fingerJoints && panel.edges?.B === 'f' ? p.thickness : 0);

  const physW = $derived(panel.w + tabL + tabR);
  const physH = $derived(panel.h + tabT + tabB);

  const scale = $derived.by(() => {
    if (!panel) return 1;
    return Math.min(
      (cw - MARGIN * 2) / physW,
      (ch - MARGIN * 2) / physH,
      20
    );
  });

  // Panel origin (0,0) in screen coordinates
  const offX = $derived(cw / 2 - physW * scale / 2 + tabL * scale);
  const offY = $derived(ch / 2 - physH * scale / 2 + tabT * scale);

  function px(mm: number) { return offX + mm * scale; }
  function py(mm: number) { return offY + mm * scale; }

  // Finger-joint path for panel outline
  const fjPath = $derived.by(() => {
    if (!p.fingerJoints || !panel.edges) return null;
    const pts = panelPoints(panel.w, panel.h, p.thickness, p.kerf, p.fingerCount, 'finger', panel.edges);
    return pointsToPath(pts);
  });

  // ── Selection & drag ────────────────────────────────────────────────────────
  let selected  = $state<string | null>(null);
  let dragging  = $state<string | null>(null);
  let dragOriginClient = { x: 0, y: 0 };
  let dragOriginMM     = { x: 0, y: 0 };

  function onCutoutPointerDown(e: PointerEvent, c: Cutout) {
    e.stopPropagation();
    selected = c.id;
    dragging = c.id;
    dragOriginClient = { x: e.clientX, y: e.clientY };
    dragOriginMM     = { x: c.x,       y: c.y       };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onSvgPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = (e.clientX - dragOriginClient.x) / scale;
    const dy = (e.clientY - dragOriginClient.y) / scale;
    // Snap to 0.5 mm grid
    const snap = 0.5;
    const nx = Math.round((dragOriginMM.x + dx) / snap) * snap;
    const ny = Math.round((dragOriginMM.y + dy) / snap) * snap;
    encFab.updateCutout(dragging, { x: nx, y: ny });
  }

  function onSvgPointerUp() { dragging = null; }

  function onPanelClick(e: MouseEvent) {
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'rect' && !(e.target as Element).hasAttribute('role')) {
      selected = null;
    }
  }

  // ── Cutout geometry helpers ─────────────────────────────────────────────────

  // Returns SVG path string in SCREEN coordinates for the cutout preview.
  // Mirrors cutoutPath() from generator but works in px (scale applied inline).
  function previewPath(c: Cutout): string {
    const dims = CUTOUT_DIMS[c.type];
    const cx = px(c.x), cy = py(c.y);
    const k  = p.kerf;

    if (dims.shape === 'circle') {
      const r = Math.max(0.5, ((c.d ?? dims.w) / 2 - k / 2) * scale);
      return `M ${cx+r},${cy} A ${r},${r} 0 1,0 ${cx-r},${cy} A ${r},${r} 0 1,0 ${cx+r},${cy} Z`;
    }
    if (dims.shape === 'rounded_rect') {
      const w = Math.max(1, ((c.w ?? dims.w) - k) * scale);
      const h = Math.max(1, ((c.h ?? dims.h) - k) * scale);
      const r = Math.min(dims.r * scale, w / 2, h / 2);
      const x1 = cx-w/2, y1 = cy-h/2, x2 = cx+w/2, y2 = cy+h/2;
      return `M ${x1+r},${y1} L ${x2-r},${y1} A ${r},${r} 0 0,1 ${x2},${y1+r} ` +
             `L ${x2},${y2-r} A ${r},${r} 0 0,1 ${x2-r},${y2} ` +
             `L ${x1+r},${y2} A ${r},${r} 0 0,1 ${x1},${y2-r} ` +
             `L ${x1},${y1+r} A ${r},${r} 0 0,1 ${x1+r},${y1} Z`;
    }
    if (dims.shape === 'trapezoid') {
      const tw = Math.max(1, ((c.w ?? dims.w) - k) * scale);
      const bw = Math.max(1, (dims.bottomW - k) * scale);
      const h  = Math.max(1, ((c.h ?? dims.h) - k) * scale);
      return `M ${cx-tw/2},${cy-h/2} L ${cx+tw/2},${cy-h/2} ` +
             `L ${cx+bw/2},${cy+h/2} L ${cx-bw/2},${cy+h/2} Z`;
    }
    if (dims.shape === 'chamfered_rect') {
      const w  = Math.max(1, ((c.w ?? dims.w) - k) * scale);
      const h  = Math.max(1, ((c.h ?? dims.h) - k) * scale);
      const ch = Math.min(dims.chamfer * scale, w / 3, h / 3);
      const x1 = cx-w/2, y1 = cy-h/2, x2 = cx+w/2, y2 = cy+h/2;
      return `M ${x1+ch},${y1} L ${x2-ch},${y1} L ${x2},${y1+ch} ` +
             `L ${x2},${y2} L ${x1},${y2} L ${x1},${y1+ch} Z`;
    }
    // plain rect
    const w = Math.max(1, ((c.w ?? dims.w) - k) * scale);
    const h = Math.max(1, ((c.h ?? dims.h) - k) * scale);
    return `M ${cx-w/2},${cy-h/2} h ${w} v ${h} h ${-w} Z`;
  }

  // Returns the half-height (in screen px) used to position the label below the cutout.
  function cutoutHalfH(c: Cutout): number {
    const dims = CUTOUT_DIMS[c.type];
    const k = p.kerf;
    if (dims.shape === 'circle') return Math.max(0.5, ((c.d ?? dims.w) / 2 - k / 2) * scale);
    return Math.max(1, ((c.h ?? dims.h) - k) / 2 * scale);
  }

  // Scale bar
  const scaleBarPx = $derived(10 * scale);
  const scaleBarX  = $derived(cw - 24 - scaleBarPx);
  const scaleBarY  = $derived(ch - 22);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="enc-view" bind:this={container}>
  <svg
    width={cw} height={ch} viewBox="0 0 {cw} {ch}"
    style="cursor: {dragging ? 'grabbing' : 'default'}"
    onpointermove={onSvgPointerMove}
    onpointerup={onSvgPointerUp}
    onpointercancel={onSvgPointerUp}
    onclick={onPanelClick}
  >

    <!-- Panel outline -->
    {#if fjPath}
      <!-- Finger-joint profile -->
      <g transform="translate({offX},{offY}) scale({scale})">
        <path d={fjPath} fill="#EDECE9" stroke="#0C0C0B" stroke-width={1/scale} stroke-linejoin="miter"/>
      </g>
    {:else}
      <rect x={offX} y={offY} width={panel.w * scale} height={panel.h * scale}
        fill="#EDECE9" stroke="#0C0C0B" stroke-width="1.5"/>
    {/if}

    <!-- Grid (5mm) when zoomed in -->
    {#if scale > 3}
      {@const gridMm = 5}
      {#each Array.from({ length: Math.floor(panel.w / gridMm) + 1 }, (_, i) => i * gridMm) as gx}
        <line x1={px(gx)} y1={offY} x2={px(gx)} y2={offY + panel.h * scale}
          stroke="#DDD8CF" stroke-width="0.4" pointer-events="none"/>
      {/each}
      {#each Array.from({ length: Math.floor(panel.h / gridMm) + 1 }, (_, i) => i * gridMm) as gy}
        <line x1={offX} y1={py(gy)} x2={offX + panel.w * scale} y2={py(gy)}
          stroke="#DDD8CF" stroke-width="0.4" pointer-events="none"/>
      {/each}
    {/if}

    <!-- Cutouts — exact connector shapes -->
    {#each panel.cutouts as c (c.id)}
      {@const isSelected = selected === c.id}
      {@const isDragging = dragging === c.id}
      {@const strokeClr  = isSelected ? '#C05430' : '#0C0C0B'}
      {@const strokeW    = isSelected ? 2 : 1}
      {@const pathD      = previewPath(c)}
      {@const hh         = cutoutHalfH(c)}
      {@const rot        = c.rotation ?? 0}

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <g transform="rotate({rot},{px(c.x)},{py(c.y)})">
        <path
          d={pathD}
          fill="rgba(255,255,255,0.75)" stroke={strokeClr} stroke-width={strokeW}
          style="cursor: {isDragging ? 'grabbing' : 'grab'}"
          onpointerdown={e => onCutoutPointerDown(e, c)}
          onclick={e => { e.stopPropagation(); selected = isSelected ? null : c.id; }}
        />
      </g>

      <!-- Cutout label -->
      <text x={px(c.x)} y={py(c.y) + hh + 11}
        text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9"
        style="fill: var(--g500)" pointer-events="none">{c.label}</text>

      <!-- Coordinate readout when selected -->
      {#if isSelected || isDragging}
        <text x={px(c.x)} y={py(c.y) - hh - 10}
          text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9"
          fill="#C05430" pointer-events="none">
          {c.x.toFixed(1)}, {c.y.toFixed(1)} mm
        </text>
        <!-- Reference lines from panel corner to cutout -->
        <line x1={offX} y1={py(c.y)} x2={px(c.x)} y2={py(c.y)}
          stroke="#C05430" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"
          pointer-events="none"/>
        <line x1={px(c.x)} y1={offY} x2={px(c.x)} y2={py(c.y)}
          stroke="#C05430" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.5"
          pointer-events="none"/>
        <!-- Small origin marker -->
        <circle cx={offX} cy={offY} r="3" fill="#C05430" opacity="0.7" pointer-events="none"/>
      {/if}
    {/each}

    <!-- Panel label and size -->
    <text x={offX + 8} y={offY - 8} font-family="IBM Plex Mono, monospace" font-size="11"
      style="fill: var(--g600)" letter-spacing="0.12em">{panel.label}</text>
    <text x={offX + panel.w * scale - 8} y={offY - 8} text-anchor="end"
      font-family="IBM Plex Mono, monospace" font-size="9"
      style="fill: var(--g400)" letter-spacing="0.06em">{panel.w.toFixed(1)} × {panel.h.toFixed(1)} mm</text>

    <!-- Scale bar (10mm) -->
    <line x1={scaleBarX} y1={scaleBarY} x2={scaleBarX + scaleBarPx} y2={scaleBarY}
      stroke="var(--g500)" stroke-width="1.5"/>
    <line x1={scaleBarX}              y1={scaleBarY - 4} x2={scaleBarX}              y2={scaleBarY + 4}
      stroke="var(--g500)" stroke-width="1"/>
    <line x1={scaleBarX + scaleBarPx} y1={scaleBarY - 4} x2={scaleBarX + scaleBarPx} y2={scaleBarY + 4}
      stroke="var(--g500)" stroke-width="1"/>
    <text x={scaleBarX + scaleBarPx / 2} y={scaleBarY - 7} text-anchor="middle"
      font-family="IBM Plex Mono, monospace" font-size="9" style="fill: var(--g400)">10 mm</text>

    <!-- Kerf info badge -->
    {#if p.kerf > 0}
      <text x={16} y={ch - 14} font-family="IBM Plex Mono, monospace" font-size="9"
        style="fill: var(--g400)" letter-spacing="0.06em">
        KERF COMP  {p.kerf.toFixed(2)} mm
      </text>
    {/if}
  </svg>
</div>

<style>
  .enc-view { position: absolute; inset: 0; background: #F6F5F3; touch-action: none; }
</style>
