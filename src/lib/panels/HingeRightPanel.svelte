<script lang="ts">
  import { hingeFab } from '$stores/hinges.svelte';
  import { downloadHingeSVG, downloadHingeDXF } from '$modules/hinges/patterns';

  const p     = $derived(hingeFab.params);
  const paths = $derived(hingeFab.paths);

  const area    = $derived((p.width * p.height / 100).toFixed(1));
  const cutArea = $derived((p.width * p.height * paths.density / 100).toFixed(1));

  // ── Fold preview physics (mirrors HingeLeftPanel calc) ────────────────────
  const rMin      = $derived(Math.max(p.rowSpacing * 2.5, p.thickness * 3.5));
  const θMaxDeg   = $derived(p.height / rMin * 180 / Math.PI);
  // Clamp to [20, 90] so the animation is always visible and meaningful
  const animAngle = $derived(Math.min(Math.max(θMaxDeg, 20), 90));

  // SVG preview layout (viewBox 0 0 200 130)
  // Panel A: y 14–40  |  Flex zone: y 40–56  |  Panel B: y 56–82 (animated)
  const pivotX = 100;
  const pivotY = 56;  // top of Panel B = bottom of flex zone
  const animVals = $derived(`0 ${pivotX} ${pivotY}; -${animAngle.toFixed(1)} ${pivotX} ${pivotY}; 0 ${pivotX} ${pivotY}`);
</script>

<div class="panel-right">

  <section class="panel-section">
    <div class="section-label">FLEX ZONE STATS</div>
    <div class="readout" style="margin-bottom:12px">
      <div class="readout-cell">
        <div class="readout-label">WIDTH</div>
        <div class="readout-value">{p.width}<span class="unit">mm</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">HEIGHT</div>
        <div class="readout-value">{p.height}<span class="unit">mm</span></div>
      </div>
    </div>

    <div class="stat-row">
      <span class="stat-key">PATTERN</span>
      <span class="stat-val">{p.pattern.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">CUT ROWS</span>
      <span class="stat-val">{paths.rowCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">ZONE AREA</span>
      <span class="stat-val">{area}<span class="unit"> cm²</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">MATERIAL t</span>
      <span class="stat-val">{p.thickness}<span class="unit"> mm</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">ROW SPACING</span>
      <span class="stat-val">{p.rowSpacing}<span class="unit"> mm</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">BRIDGE</span>
      <span class="stat-val">{p.bridge}<span class="unit"> mm</span></span>
    </div>
  </section>

  <!-- FOLD PREVIEW -->
  <section class="panel-section">
    <div class="section-label">FOLD PREVIEW  ·  {animAngle.toFixed(0)}°</div>
    <svg viewBox="0 0 200 100" class="fold-svg" aria-label="Animated fold preview">

      <!-- Panel A — fixed base -->
      <rect x="4" y="8" width="192" height="30" fill="var(--g100)" stroke="var(--g400)" stroke-width="0.8"/>
      <text x="12" y="26" font-family="IBM Plex Mono, monospace" font-size="8" fill="var(--g500)" letter-spacing="0.06em">PANEL A</text>

      <!-- Flex zone with hatch lines suggesting kerf cuts -->
      <rect x="4" y="38" width="192" height="18" fill="var(--g50)" stroke="var(--g300)" stroke-width="0.5" stroke-dasharray="2,2"/>
      {#each [20,36,52,68,84,100,116,132,148,164,180] as hx}
        <line x1={hx - 3} y1="38" x2={hx + 3} y2="56" stroke="var(--g400)" stroke-width="0.6"/>
      {/each}
      <text x="100" y="51" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="7" fill="var(--g400)" letter-spacing="0.06em">FLEX ZONE</text>

      <!-- Panel B — animated, rotates around top edge (y=56) -->
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={animVals}
          dur="2.8s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0; 0.5; 1"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
        />
        <rect x="4" y="56" width="192" height="30" fill="var(--g200)" stroke="var(--g500)" stroke-width="0.8"/>
        <text x="12" y="74" font-family="IBM Plex Mono, monospace" font-size="8" fill="var(--g600)" letter-spacing="0.06em">PANEL B</text>
      </g>

      <!-- Angle arc indicator -->
      <text x="196" y="60" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="7.5" fill="var(--orange)" letter-spacing="0.04em">{animAngle.toFixed(0)}°</text>
    </svg>
    <div class="fold-sub">
      R_min {rMin.toFixed(1)} mm  ·  {θMaxDeg < 90 ? 'limited flex — increase zone height' : 'full 90° achievable'}
    </div>
  </section>

  <section class="panel-section">
    <div class="section-label">EXPORT</div>
    <button class="export-btn ready" onclick={() => downloadHingeSVG(p, paths)}>EXPORT SVG</button>
    <button class="export-btn dxf"   onclick={() => downloadHingeDXF(p, paths)}>EXPORT DXF</button>
    <div class="export-sub">
      SVG: mm-calibrated · includes outline + cuts<br>
      DXF: R12 format · 1 unit = 1 mm
    </div>
  </section>

</div>

<style>
  .fold-svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .fold-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    letter-spacing: 0.04em;
    margin-top: 6px;
    line-height: 1.6;
  }
</style>
