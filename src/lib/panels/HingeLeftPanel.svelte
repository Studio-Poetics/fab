<script lang="ts">
  import NumInput   from '$lib/components/NumInput.svelte';
  import SegControl from '$lib/components/SegControl.svelte';
  import { hingeFab } from '$stores/hinges.svelte';
  import { PATTERN_LABELS, type HingePattern } from '$modules/hinges/types';

  const p = $derived(hingeFab.params);

  const patternOpts = (['kerf', 'wave', 'cross'] as HingePattern[]).map(v => ({
    value: v, label: PATTERN_LABELS[v],
  }));

  // ── Flex physics ────────────────────────────────────────────────────────────
  // Conservative minimum bend radius based on row spacing and material thickness.
  // Empirical for laser-cut wood/acrylic: R_min ≈ max(rowSpacing×2.5, thickness×3.5)
  const rMin   = $derived(Math.max(p.rowSpacing * 2.5, p.thickness * 3.5));

  // Maximum achievable flex angle for this hinge zone height.
  const θMaxRad = $derived(p.height / rMin);
  const θMaxDeg = $derived(θMaxRad * 180 / Math.PI);

  // Rib thickness to material thickness ratio — below ~0.8 risks stress cracking
  const ribRatio = $derived(p.rowSpacing / p.thickness);

  // Warnings
  const warnRib    = $derived(ribRatio < 0.8);
  const warnBridge = $derived(p.bridge < p.thickness * 0.75);
  const warnAngle  = $derived(θMaxDeg < 70);
  const goodAngle  = $derived(θMaxDeg >= 90);

  function angleColor(): string {
    if (θMaxDeg >= 90)  return 'var(--green)';
    if (θMaxDeg >= 60)  return 'var(--orange)';
    return 'var(--red)';
  }
</script>

<div class="panel-left">

  <section class="panel-section">
    <div class="section-label">PATTERN</div>
    <SegControl
      options={patternOpts}
      value={p.pattern}
      onchange={(v) => hingeFab.update({ pattern: v as HingePattern })}
    />
    <div class="stat-row" style="margin-top:10px">
      <span class="stat-key">ROWS</span>
      <span class="stat-val">{hingeFab.paths.rowCount}</span>
    </div>
  </section>

  <section class="panel-section">
    <div class="section-label">FLEX ZONE</div>
    <NumInput label="WIDTH"  value={p.width}  min={10} max={500} step={5}   unit="mm" onchange={v => hingeFab.update({ width: v })} />
    <NumInput label="HEIGHT" value={p.height} min={10} max={500} step={5}   unit="mm" onchange={v => hingeFab.update({ height: v })} />
    <NumInput label="MATERIAL t" value={p.thickness} min={1} max={25} step={0.5} unit="mm" onchange={v => hingeFab.update({ thickness: v })} />
  </section>

  <section class="panel-section">
    <div class="section-label">CUT PARAMS</div>
    <NumInput label="ROW SPACING" value={p.rowSpacing} min={1}   max={20}  step={0.5}  unit="mm" onchange={v => hingeFab.update({ rowSpacing: v })} />
    <NumInput label="BRIDGE"      value={p.bridge}     min={1}   max={30}  step={0.5}  unit="mm" onchange={v => hingeFab.update({ bridge: v })} />

    {#if p.pattern === 'wave'}
      <NumInput label="AMPLITUDE" value={p.amplitude} min={0.5} max={8}   step={0.25} unit="mm" onchange={v => hingeFab.update({ amplitude: v })} />
    {/if}

    {#if p.pattern === 'cross'}
      <NumInput label="CUT LENGTH" value={p.cutLength} min={4}   max={60}  step={1}    unit="mm" onchange={v => hingeFab.update({ cutLength: v })} />
      <NumInput label="CUT GAP"    value={p.cutGap}    min={1}   max={20}  step={0.5}  unit="mm" onchange={v => hingeFab.update({ cutGap: v })} />
    {/if}
  </section>

  <section class="panel-section">
    <div class="section-label">FLEX ANALYSIS</div>
    <div class="stat-row">
      <span class="stat-key">MIN BEND RADIUS</span>
      <span class="stat-val">{rMin.toFixed(1)}<span class="unit"> mm</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">MAX FLEX ANGLE</span>
      <span class="stat-val" style="color:{angleColor()}">{θMaxDeg.toFixed(0)}°
        {#if goodAngle}✓{:else if warnAngle}⚠{/if}
      </span>
    </div>
    <div class="stat-row">
      <span class="stat-key">ROW/t RATIO</span>
      <span class="stat-val" style="color:{warnRib ? 'var(--red)' : 'inherit'}">{ribRatio.toFixed(2)}{warnRib ? '  ⚠' : ''}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">FLEX AXIS</span>
      <span class="stat-val">{p.pattern === 'cross' ? 'BOTH' : 'SINGLE'}</span>
    </div>

    {#if warnRib}
      <div class="warn-block">
        Row spacing ({p.rowSpacing} mm) &lt; 0.8× material ({(p.thickness * 0.8).toFixed(1)} mm) — risk of stress cracking between cuts.
      </div>
    {/if}
    {#if warnBridge}
      <div class="warn-block">
        Bridge ({p.bridge} mm) &lt; 0.75× material ({(p.thickness * 0.75).toFixed(1)} mm) — tabs may tear under tension.
      </div>
    {/if}
    {#if warnAngle}
      <div class="warn-block">
        Zone only achieves {θMaxDeg.toFixed(0)}° max. Increase HEIGHT or reduce ROW SPACING for a full 90° fold.
      </div>
    {/if}

    <div class="hint-text" style="margin-top:8px">
      Fold preview animates in right panel at computed max angle.<br>
      Formula: R_min = max(spacing×2.5, t×3.5)
    </div>
  </section>

</div>

<style>
  .hint-text {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--g500);
    line-height: 1.7;
    letter-spacing: 0.03em;
    margin-top: 8px;
  }
  .warn-block {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--red);
    line-height: 1.6;
    letter-spacing: 0.03em;
    border-left: 2px solid var(--red);
    padding-left: 8px;
    margin-top: 6px;
  }
</style>
