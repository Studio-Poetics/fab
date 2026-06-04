<script lang="ts">
  import { onMount } from 'svelte';
  import type { Panel } from '$core/types';
  import type { BoxParams } from '$modules/boxes/types';
  import { panelPoints, pointsToPath, hingeLines, grooveLines, dividerSlotPoints } from '$core/geometry/joints';
  import { layoutPanels } from '$core/geometry/layout';
  import { ui } from '$stores/ui.svelte';

  interface Props {
    panels: Panel[];
    params: BoxParams;
  }

  const FILLS  = ['#F6F5F3','#EDECE9','#E8E7E4','#E2E1DC','#DDD8CF'];
  const CUT    = '#0C0C0B';
  const HINGE  = '#C05430';
  const GROOVE = '#1A7A3F';
  const MARGIN = 24;

  let { panels, params }: Props = $props();

  let container: HTMLDivElement;
  let cw = $state(800);
  let ch = $state(600);

  let zoom       = $state(1);
  let panX       = $state(0);
  let panY       = $state(0);
  let isDragging = $state(false);
  let lastX = 0, lastY = 0;

  onMount(() => {
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      cw = e.contentRect.width;
      ch = e.contentRect.height;
    });
    ro.observe(container);
    cw = container.clientWidth;
    ch = container.clientHeight;
    return () => ro.disconnect();
  });

  const layout = $derived(layoutPanels(panels, params.thickness));

  const baseScale = $derived.by(() => {
    const avW = cw - MARGIN * 2;
    const avH = ch - MARGIN * 2;
    if (layout.totalW <= 0 || layout.totalH <= 0) return 1;
    return Math.min(avW / layout.totalW, avH / layout.totalH, 3);
  });

  const scale = $derived(baseScale * zoom);

  const ox = $derived((cw - layout.totalW * scale) / 2 + panX);
  const oy = $derived((ch - layout.totalH * scale) / 2 + panY);

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.min(Math.max(zoom * delta, 0.2), 10);
  }

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    panX += e.clientX - lastX;
    panY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onMouseUp() { isDragging = false; }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  function onDblClick() { resetView(); }

  function getPath(panel: Panel): string {
    const { thickness: t, kerf: k, fingerCount: fc, joint } = params;
    const pts = panelPoints(panel.width, panel.height, t, k, fc, joint, panel.edges);
    return pointsToPath(pts);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fab-view"
  bind:this={container}
  onwheel={onWheel}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  ondblclick={onDblClick}
  style="cursor: {isDragging ? 'grabbing' : 'grab'}"
>
  <svg width={cw} height={ch} viewBox="0 0 {cw} {ch}">
    <g transform="translate({ox},{oy}) scale({scale})">
      <!-- sheet boundary overlay -->
      {#if ui.showSheet}
        {@const fits = layout.totalW <= ui.sheetW && layout.totalH <= ui.sheetH}
        {@const sheetClr = fits ? '#1A7A3F' : '#D0190C'}
        <rect x={0} y={0} width={ui.sheetW} height={ui.sheetH}
          fill={fits ? 'rgba(26,122,63,0.04)' : 'rgba(208,25,12,0.04)'}
          stroke={sheetClr} stroke-width={1/scale}
          stroke-dasharray="{6/scale},{4/scale}"/>
        <text x={2/scale} y={-5/scale}
          font-family="IBM Plex Mono,monospace" font-size={7.5/scale}
          fill={sheetClr} opacity="0.7" letter-spacing="0.06em">
          {ui.sheetW}×{ui.sheetH} mm · {fits ? 'FITS' : 'TOO LARGE'}
        </text>
      {/if}

      <!-- subtle grid -->
      <g opacity="0.04">
        {#each Array.from({length: Math.ceil(layout.totalW/50)+1}, (_,i)=>i*50) as x}
          <line x1={x} y1={0} x2={x} y2={layout.totalH} stroke="#000" stroke-width={0.5/scale}/>
        {/each}
        {#each Array.from({length: Math.ceil(layout.totalH/50)+1}, (_,i)=>i*50) as y}
          <line x1={0} y1={y} x2={layout.totalW} y2={y} stroke="#000" stroke-width={0.5/scale}/>
        {/each}
      </g>

      <!-- panels -->
      {#each layout.placements as { panel, x, y } (panel.id)}
        {@const sw = 0.8/scale}
        {@const fill = FILLS[panel.tint] ?? FILLS[0]}
        <g transform="translate({x},{y})">
          <path
            d={getPath(panel)}
            fill={fill}
            stroke={CUT}
            stroke-width={sw}
            stroke-linejoin="miter"
          />

          {#if panel.special}
            {@const sp = panel.special}

            {#if sp.type === 'hinge'}
              {#each hingeLines(panel.width, sp.y, sp.hingeH, params.thickness) as [[x1,y1],[x2,y2]]}
                <line {x1} {y1} {x2} {y2} stroke={HINGE} stroke-width={0.5/scale}/>
              {/each}
              <rect x={0} y={sp.y} width={panel.width} height={sp.hingeH}
                fill="none" stroke={HINGE} stroke-width={0.4/scale}
                stroke-dasharray="{4/scale},{3/scale}" opacity={0.5}/>
              <rect x={0} y={sp.lidY} width={panel.width} height={sp.lidH}
                fill="none" stroke="#888" stroke-width={0.4/scale}
                stroke-dasharray="{4/scale},{3/scale}" opacity={0.4}/>
              <text x={panel.width/2} y={sp.y + sp.hingeH/2}
                text-anchor="middle" dominant-baseline="middle"
                font-family="IBM Plex Mono,monospace" font-size={7/scale}
                fill={HINGE} opacity={0.7}>HINGE</text>
            {/if}

            {#if sp.type === 'groove'}
              {#each grooveLines(panel.width, panel.height, sp.grooveY, sp.grooveH) as [[x1,y1],[x2,y2]]}
                <line {x1} {y1} {x2} {y2} stroke={GROOVE} stroke-width={0.6/scale}
                  stroke-dasharray="{3/scale},{2/scale}"/>
              {/each}
              <text x={panel.width/2} y={sp.grooveY + sp.grooveH/2}
                text-anchor="middle" dominant-baseline="middle"
                font-family="IBM Plex Mono,monospace" font-size={7/scale}
                fill={GROOVE} opacity={0.7}>GROOVE</text>
            {/if}

            {#if sp.type === 'divider'}
              {#each sp.slots as slot}
                {@const pts2 = dividerSlotPoints(panel.width, panel.height, slot.pos, slot.w, slot.d, slot.from)}
                <path d={pointsToPath(pts2)} fill="none" stroke={CUT} stroke-width={sw}/>
              {/each}
            {/if}
          {/if}

          <!-- panel label -->
          <text
            x={4/scale} y={12/scale}
            font-family="IBM Plex Mono,monospace"
            font-size={9/scale}
            fill="#888" opacity={0.6}
          >{panel.label}</text>
          <!-- dimensions -->
          <text
            x={panel.width/2} y={panel.height + 13/scale}
            text-anchor="middle"
            font-family="IBM Plex Mono,monospace"
            font-size={7/scale}
            fill="#888" opacity={0.4}
          >{panel.width.toFixed(0)}×{panel.height.toFixed(0)}</text>
        </g>
      {/each}
    </g>
  </svg>

  <button class="btn-reset" onclick={resetView} title="Reset view (or double-click)">⟳</button>
  <div class="hint">SCROLL TO ZOOM · DRAG TO PAN · DOUBLE-CLICK TO FIT</div>
</div>

<style>
  .fab-view {
    position: absolute;
    inset: 0;
    overflow: hidden;
    user-select: none;
  }
  .fab-view svg {
    width: 100%;
    height: 100%;
  }
  .btn-reset {
    position: absolute;
    top: 10px; right: 10px;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--g500);
    background: var(--white);
    border: 1px solid var(--g200);
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.12s;
    z-index: 10;
  }
  .btn-reset:hover { color: var(--black); border-color: var(--g400); }
  .hint {
    position: absolute;
    bottom: 10px; left: 50%; transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: 9px; letter-spacing: 0.1em;
    color: var(--g400);
    pointer-events: none;
    white-space: nowrap;
  }
</style>
