<script lang="ts">
  import { encFab } from '$stores/enclosures.svelte';
  import { panelSVG } from '$modules/enclosures/generator';
  import { strToU8, zipSync } from 'fflate';
  import { units } from '$stores/units.svelte';

  function fmt(mm: number) {
    const v = units.toDisplay(mm);
    return units.label === 'in' ? v.toFixed(3) : v.toFixed(1);
  }

  const p      = $derived(encFab.params);
  const panels = $derived(encFab.panels);

  const totalCutouts = $derived(p.cutouts.length);

  function downloadPanel(side: string) {
    const panel = panels.find(pl => pl.side === side);
    if (!panel) return;
    const svg  = panelSVG(panel, p);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `enclosure_${side}_${p.width}x${p.height}x${p.depth}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    const files: Record<string, Uint8Array> = {};
    for (const panel of panels) {
      const svg = panelSVG(panel, p);
      files[`enclosure_${panel.side}.svg`] = strToU8(svg);
    }
    const zipped = zipSync(files);
    const blob   = new Blob([zipped], { type: 'application/zip' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `enclosure_${p.width}x${p.height}x${p.depth}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="panel-right">

  <section class="panel-section">
    <div class="section-label">DIMENSIONS <span class="section-label-tag">{units.label}</span></div>
    <div class="readout">
      <div class="readout-cell">
        <div class="readout-label">WIDTH</div>
        <div class="readout-value">{fmt(p.width)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">HEIGHT</div>
        <div class="readout-value">{fmt(p.height)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">DEPTH</div>
        <div class="readout-value">{fmt(p.depth)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">MATERIAL</div>
        <div class="readout-value">{fmt(p.thickness)}<span class="unit">{units.label}</span></div>
      </div>
    </div>
  </section>

  <section class="panel-section">
    <div class="section-label">STATISTICS</div>
    <div class="stat-row">
      <span class="stat-key">PANELS</span>
      <span class="stat-val">6</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">TOTAL CUTOUTS</span>
      <span class="stat-val">{totalCutouts}</span>
    </div>
    {#each panels as panel}
      {#if panel.cutouts.length > 0}
        <div class="stat-row">
          <span class="stat-key">{panel.label}</span>
          <span class="stat-val">{panel.cutouts.length} cut{panel.cutouts.length > 1 ? 's' : ''}</span>
        </div>
      {/if}
    {/each}
  </section>

  <section class="panel-section">
    <div class="section-label">EXPORT PANELS</div>
    {#each panels as panel}
      <button class="export-btn ready" onclick={() => downloadPanel(panel.side)}>
        {panel.label}  SVG
      </button>
    {/each}
  </section>

  <section class="panel-section">
    <div class="section-label">EXPORT ALL</div>
    <button class="export-btn zip" onclick={downloadAll}>EXPORT ZIP  (ALL PANELS)</button>
    <div class="export-sub">6 SVG files zipped · 1 unit = 1 mm</div>
  </section>

</div>
