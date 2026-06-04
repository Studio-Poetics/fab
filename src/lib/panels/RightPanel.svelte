<script lang="ts">
  import { fab } from '$stores/fabrication.svelte';
  import { units } from '$stores/units.svelte';
  import { ui } from '$stores/ui.svelte';
  import { downloadSVG } from '$core/exporters/svg';
  import { downloadDXF } from '$core/exporters/dxf';
  import { downloadBoxZip } from '$core/exporters/zip';

  const totalArea = $derived(
    fab.panels.reduce((sum, p) => sum + p.width * p.height, 0)
  );

  const layout     = $derived(fab.layout);
  const sheetFits  = $derived(layout.totalW <= ui.sheetW && layout.totalH <= ui.sheetH);
  const wasteArea  = $derived(ui.sheetW * ui.sheetH - totalArea);
  const wastePct   = $derived(sheetFits ? (wasteArea / (ui.sheetW * ui.sheetH) * 100) : null);

  // Multi-section cell dimensions
  const cellDims = $derived.by(() => {
    const p = fab.params;
    if (p.boxType !== 'multi') return null;
    const t = p.thickness;
    const cellW = (p.width  - (p.sectionsX + 1) * t) / p.sectionsX;
    const cellH = p.height - 2 * t;
    const cellD = (p.depth  - (p.sectionsY + 1) * t) / p.sectionsY;
    return { cellW, cellH, cellD };
  });

  function onExportSVG() {
    if (fab.valid) downloadSVG(fab.panels, fab.params);
  }

  function onExportDXF() {
    if (fab.valid) downloadDXF(fab.panels, fab.params);
  }

  function fmt(mm: number) {
    const v = units.toDisplay(mm);
    return units.label === 'in' ? v.toFixed(3) : v.toFixed(1);
  }
</script>

<div class="panel-right">
  <!-- READOUT -->
  <section class="panel-section">
    <div class="section-label">DIMENSIONS <span class="section-label-tag">{units.label}</span></div>
    <div class="readout">
      <div class="readout-cell">
        <div class="readout-label">WIDTH</div>
        <div class="readout-value">{fmt(fab.params.width)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">HEIGHT</div>
        <div class="readout-value">{fmt(fab.params.height)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">DEPTH</div>
        <div class="readout-value">{fmt(fab.params.depth)}<span class="unit">{units.label}</span></div>
      </div>
      <div class="readout-cell">
        <div class="readout-label">THICKNESS</div>
        <div class="readout-value">{fmt(fab.params.thickness)}<span class="unit">{units.label}</span></div>
      </div>
    </div>
  </section>

  <!-- STATS -->
  <section class="panel-section">
    <div class="section-label">STATISTICS</div>
    <div class="stat-row">
      <span class="stat-key">PANELS</span>
      <span class="stat-val">{fab.panels.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">TOTAL AREA</span>
      {#if units.display === 'in'}
        <span class="stat-val">{(totalArea / 645.16).toFixed(2)}<span class="unit"> in²</span></span>
      {:else}
        <span class="stat-val">{(totalArea / 100).toFixed(1)}<span class="unit"> cm²</span></span>
      {/if}
    </div>
    <div class="stat-row">
      <span class="stat-key">JOINT</span>
      <span class="stat-val">{fab.params.joint === 'finger' ? `FINGER ×${fab.params.fingerCount}` : 'PLAIN'}</span>
    </div>
    <div class="stat-row">
      <span class="stat-key">KERF</span>
      <span class="stat-val">{fab.params.kerf}<span class="unit"> mm</span></span>
    </div>
    <div class="stat-row">
      <span class="stat-key">MATERIAL</span>
      <span class="stat-val">{fab.params.material.toUpperCase()}</span>
    </div>
    {#if cellDims}
      <div class="stat-divider"></div>
      <div class="stat-row">
        <span class="stat-key">CELLS</span>
        <span class="stat-val">{fab.params.sectionsX} × {fab.params.sectionsY}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">CELL W</span>
        <span class="stat-val">{cellDims.cellW.toFixed(1)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">CELL H</span>
        <span class="stat-val">{cellDims.cellH.toFixed(1)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">CELL D</span>
        <span class="stat-val">{cellDims.cellD.toFixed(1)}<span class="unit"> mm</span></span>
      </div>
    {/if}
  </section>

  <!-- SHEET CONTEXT -->
  <section class="panel-section">
    <div class="section-label">CUT SHEET</div>
    <div class="sheet-inputs">
      <div class="sheet-field">
        <span class="stat-key">W</span>
        <input type="number" class="sheet-input"
          value={units.toDisplay(ui.sheetW).toFixed(units.display === 'in' ? 2 : 0)}
          min={units.toDisplay(50).toFixed(0)} max={units.toDisplay(3000).toFixed(0)}
          step={units.dimStep()}
          onchange={e => ui.sheetW = units.fromDisplay(parseFloat((e.target as HTMLInputElement).value))} />
        <span class="stat-key">{units.label}</span>
      </div>
      <div class="sheet-field">
        <span class="stat-key">H</span>
        <input type="number" class="sheet-input"
          value={units.toDisplay(ui.sheetH).toFixed(units.display === 'in' ? 2 : 0)}
          min={units.toDisplay(50).toFixed(0)} max={units.toDisplay(3000).toFixed(0)}
          step={units.dimStep()}
          onchange={e => ui.sheetH = units.fromDisplay(parseFloat((e.target as HTMLInputElement).value))} />
        <span class="stat-key">{units.label}</span>
      </div>
    </div>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-key">FITS ON SHEET</span>
      <span class="stat-val" style="color:{sheetFits ? 'var(--green)' : 'var(--red)'}">
        {sheetFits ? 'YES' : 'NO  — TOO LARGE'}
      </span>
    </div>
    <div class="stat-row">
      <span class="stat-key">WASTE</span>
      <span class="stat-val">
        {#if wastePct !== null}{wastePct.toFixed(1)}%{:else}—{/if}
      </span>
    </div>
    <div class="stat-row">
      <span class="stat-key">LAYOUT SIZE</span>
      <span class="stat-val">{layout.totalW.toFixed(0)}×{layout.totalH.toFixed(0)}<span class="unit"> mm</span></span>
    </div>
    <div class="hint-text" style="margin-top:4px">Overlay shown in fabrication view.</div>
  </section>

  <!-- WARNINGS -->
  <section class="panel-section">
    <div class="section-label">CHECKS</div>
    {#if fab.warnings.length === 0}
      <div class="no-warnings">✓ ALL CHECKS PASSED</div>
    {:else}
      {#each fab.warnings as w (w.message)}
        <div class="warning-item">
          <span class="warning-icon {w.level === 'error' ? 'error' : ''}">{w.level === 'error' ? 'ERR' : 'WRN'}</span>
          <span class="warning-text">{w.message}</span>
        </div>
      {/each}
    {/if}
  </section>

  <!-- EXPORT -->
  <section class="panel-section">
    <div class="section-label">EXPORT</div>
    <button class="export-btn {fab.valid ? 'ready' : ''}" disabled={!fab.valid} onclick={onExportSVG}>EXPORT SVG</button>
    <button class="export-btn dxf" disabled={!fab.valid} onclick={onExportDXF}>EXPORT DXF</button>
    <button class="export-btn zip" disabled={!fab.valid} onclick={() => fab.valid && downloadBoxZip(fab.panels, fab.params)}>EXPORT ZIP  (SVG + DXF)</button>
    <div class="export-sub">SVG for preview · DXF for laser cutter<br>1 unit = 1 mm · R12 format</div>
  </section>
</div>

<style>
  .stat-divider {
    height: 1px;
    background: var(--g200);
    margin: 6px 0;
  }
  .sheet-inputs {
    display: flex;
    gap: 8px;
  }
  .sheet-field {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
  }
  .sheet-input {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--black);
    background: var(--white);
    border: 1px solid var(--g200);
    padding: 5px 7px;
    width: 100%;
    outline: none;
  }
  .sheet-input:focus { border-color: var(--orange); }
  .hint-text {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    line-height: 1.7;
    letter-spacing: 0.03em;
  }
</style>
