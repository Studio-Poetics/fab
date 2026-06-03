<script lang="ts">
  import { onMount } from 'svelte';
  import { hingeFab } from '$stores/hinges.svelte';

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

  const p     = $derived(hingeFab.params);
  const paths = $derived(hingeFab.paths);

  // Fit hinge rect in viewport with padding
  const MARGIN = 48;
  const scale = $derived.by(() => {
    if (p.width <= 0 || p.height <= 0) return 1;
    return Math.min(
      (cw - MARGIN * 2) / p.width,
      (ch - MARGIN * 2) / p.height,
      12
    );
  });
  const ox = $derived((cw - p.width  * scale) / 2);
  const oy = $derived((ch - p.height * scale) / 2);

  const sw = $derived(0.8 / scale);  // stroke-width in hinge units

  // Bend indicator (small arrows suggesting flex direction)
  const bendArrowY = $derived(p.height / 2);
</script>

<div class="hinge-view" bind:this={container}>
  <svg width={cw} height={ch} viewBox="0 0 {cw} {ch}">

    <!-- Material zone shadow -->
    <rect
      x={ox - 2} y={oy - 2}
      width={p.width * scale + 4} height={p.height * scale + 4}
      fill="none" stroke="var(--g200)" stroke-width="1"
    />

    <!-- Material fill -->
    <rect
      x={ox} y={oy}
      width={p.width * scale} height={p.height * scale}
      fill="var(--g50)" stroke="var(--g400)" stroke-width="0.5"
    />

    <!-- Hinge cuts (transform: scale from mm to px) -->
    <g transform="translate({ox},{oy}) scale({scale})">
      <path
        d={paths.cuts}
        fill="none"
        stroke="var(--black)"
        stroke-width={sw}
        stroke-linecap="round"
      />
    </g>

    <!-- Dimension labels -->
    <!-- Width label (top) -->
    <line
      x1={ox} y1={oy - 14} x2={ox + p.width * scale} y2={oy - 14}
      stroke="var(--g300)" stroke-width="0.5"
    />
    <line x1={ox} y1={oy - 18} x2={ox} y2={oy - 10} stroke="var(--g300)" stroke-width="0.5"/>
    <line x1={ox + p.width * scale} y1={oy - 18} x2={ox + p.width * scale} y2={oy - 10} stroke="var(--g300)" stroke-width="0.5"/>
    <text
      x={ox + p.width * scale / 2} y={oy - 19}
      text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9"
      style="fill: var(--g500)" letter-spacing="0.08em"
    >{p.width} mm</text>

    <!-- Height label (right) -->
    <line
      x1={ox + p.width * scale + 14} y1={oy}
      x2={ox + p.width * scale + 14} y2={oy + p.height * scale}
      stroke="var(--g300)" stroke-width="0.5"
    />
    <line x1={ox + p.width * scale + 10} y1={oy} x2={ox + p.width * scale + 18} y2={oy} stroke="var(--g300)" stroke-width="0.5"/>
    <line x1={ox + p.width * scale + 10} y1={oy + p.height * scale} x2={ox + p.width * scale + 18} y2={oy + p.height * scale} stroke="var(--g300)" stroke-width="0.5"/>
    <text
      x={ox + p.width * scale + 26}
      y={oy + p.height * scale / 2}
      text-anchor="start" font-family="IBM Plex Mono, monospace" font-size="9"
      style="fill: var(--g500)" letter-spacing="0.08em"
      transform="rotate(90, {ox + p.width * scale + 26}, {oy + p.height * scale / 2})"
    >{p.height} mm</text>

    <!-- Row count badge (bottom-right) -->
    <text
      x={cw - 16} y={ch - 26}
      text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9"
      style="fill: var(--g400)" letter-spacing="0.08em"
    >{paths.rowCount} ROWS</text>
    <text
      x={cw - 16} y={ch - 14}
      text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9"
      style="fill: var(--g400)" letter-spacing="0.08em"
    >SPACING {p.rowSpacing} mm</text>
  </svg>
</div>

<style>
  .hinge-view { position: absolute; inset: 0; background: var(--white); }
</style>
