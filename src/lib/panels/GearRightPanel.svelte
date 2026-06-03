<script lang="ts">
  import type { Gear } from '@dromney/gear-gen';
  import { gearFab } from '$stores/gears.svelte';
  import { downloadGearSTL, downloadGearOBJ } from '$modules/gears/threeD';

  const p  = $derived(gearFab.params);
  const gs = $derived(gearFab.spur);
  const ps = $derived(gearFab.planetary);

  // Standard ISO modules: 0.3 0.4 0.5 0.6 0.7 0.8 1 1.25 1.5 2 2.5 3 4 5 6 8 10 12 16 20
  const STD_MODULES = [0.3,0.4,0.5,0.6,0.7,0.8,1,1.25,1.5,2,2.5,3,4,5,6,8,10,12,16,20];
  const isStdModule = $derived(STD_MODULES.some(m => Math.abs(m - p.module) < 0.001));

  // Pitch diameters (mm): PD = module × N (pitch radius × 2)
  const pd1 = $derived(p.module * p.N1);
  const pd2 = $derived(p.module * p.N2);
  const pd3 = $derived(p.N3 !== null ? p.module * p.N3 : null);

  // Diametral pitch (teeth per inch) — US standard gears
  const dp = $derived(25.4 / p.module);

  // Spur RPMs
  const rpmZ2 = $derived(-(p.inputRPM * p.N1 / p.N2));
  const rpmZ3 = $derived(gs.g3 ? p.inputRPM * p.N1 / p.N3! : null);

  // Planetary RPMs
  const sunRPM     = $derived(p.inputRPM);
  const carrierRPM = $derived(p.inputRPM * ps.omegaCarrier);
  const ringRPM    = $derived(p.inputRPM * ps.omegaRing);

  function exportSVG(gear: Gear, label: string) {
    const pts    = gear.pointsLinear;
    const margin = 2;
    const size   = gear.rOuter + margin;
    const holeR  = p.holeD / 2;

    const profile = 'M' + pts.map(pt => `${pt.x.toFixed(5)},${pt.y.toFixed(5)}`).join(' ') + 'Z';
    const hole    = holeR > 0
      ? ` M${holeR},0 A${holeR},${holeR} 0 1,0 -${holeR},0 A${holeR},${holeR} 0 1,0 ${holeR},0 Z`
      : '';

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg"`,
      `  width="${(size * 2).toFixed(3)}mm" height="${(size * 2).toFixed(3)}mm"`,
      `  viewBox="${(-size).toFixed(3)} ${(-size).toFixed(3)} ${(size * 2).toFixed(3)} ${(size * 2).toFixed(3)}">`,
      `<path d="${profile}${hole}" fill="none" stroke="#000000" stroke-width="0.05" fill-rule="evenodd"/>`,
      `</svg>`,
    ].join('\n');

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `gear_${label}_N${gear.N}_m${p.module}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportDXF(gear: Gear, label: string) {
    gear.updateDXF();
    gear.downloadDXF();
  }
</script>

<div class="panel-right">

  {#if p.gearMode === 'spur'}

    <!-- ── SPUR STATS ──────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">PAIR STATS</div>
      <div class="readout" style="margin-bottom:12px">
        <div class="readout-cell">
          <div class="readout-label">CD  Z₁–Z₂</div>
          <div class="readout-value">{(gs.g2.internal ? gs.g2.r - gs.g1.r : gs.g1.r + gs.g2.r).toFixed(2)}<span class="unit">mm</span></div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">{gs.g3 ? 'TOTAL RATIO' : 'RATIO'}</div>
          <div class="readout-value">{gs.g3 ? gs.g3.totalRatio.toFixed(4) : (p.N2 / p.N1).toFixed(4)}</div>
        </div>
      </div>

      {#if gs.g3}
        <div class="stat-row">
          <span class="stat-key">CD  Z₂–Z₃</span>
          <span class="stat-val">{(gs.g2.r + gs.g3.r).toFixed(2)}<span class="unit"> mm</span></span>
        </div>
        <div class="stat-row">
          <span class="stat-key">RATIO  Z₁:Z₂</span>
          <span class="stat-val">{(p.N2 / p.N1).toFixed(4)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-key">RATIO  Z₂:Z₃</span>
          <span class="stat-val">{(p.N3! / p.N2).toFixed(4)}</span>
        </div>
      {/if}

      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">MODULE</span>
        <span class="stat-val">{p.module}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">STD MODULE</span>
        <span class="stat-val" style="color:{isStdModule ? 'var(--green)' : 'var(--orange)'}">
          {isStdModule ? 'YES  (ISO)' : 'NON-STANDARD'}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-key">DP  (TEETH/IN)</span>
        <span class="stat-val">{dp.toFixed(3)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PRESSURE ANGLE</span>
        <span class="stat-val">{p.PADeg}°</span>
      </div>
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PD  Z₁</span>
        <span class="stat-val">{pd1.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">OD  Z₁  (TIP)</span>
        <span class="stat-val">{gs.modOD1.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PD  Z₂</span>
        <span class="stat-val">{pd2.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">OD  Z₂  (TIP)</span>
        <span class="stat-val">{gs.modOD2.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      {#if gs.g3 && pd3 !== null}
        <div class="stat-row">
          <span class="stat-key">PD  Z₃</span>
          <span class="stat-val">{pd3.toFixed(2)}<span class="unit"> mm</span></span>
        </div>
        <div class="stat-row">
          <span class="stat-key">OD  Z₃  (TIP)</span>
          <span class="stat-val">{(p.module * (p.N3! + 2)).toFixed(2)}<span class="unit"> mm</span></span>
        </div>
      {/if}
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">BORE Ø</span>
        <span class="stat-val">{p.holeD}<span class="unit"> mm</span></span>
      </div>
    </section>

    <!-- ── SPUR RPM ────────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">RPM  READOUT</div>
      <div class="rpm-row">
        <span class="rpm-label">Z₁  INPUT</span>
        <span class="rpm-val">{p.inputRPM.toFixed(1)}</span>
        <span class="rpm-unit">RPM  ⟳</span>
      </div>
      <div class="rpm-row">
        <span class="rpm-label">Z₂  OUTPUT</span>
        <span class="rpm-val">{Math.abs(rpmZ2).toFixed(1)}</span>
        <span class="rpm-unit">RPM  ⟲</span>
      </div>
      {#if rpmZ3 !== null}
        <div class="rpm-row">
          <span class="rpm-label">Z₃  OUTPUT</span>
          <span class="rpm-val">{Math.abs(rpmZ3).toFixed(1)}</span>
          <span class="rpm-unit">RPM  ⟳</span>
        </div>
      {/if}
    </section>

    <!-- ── SPUR EXPORT ────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">EXPORT  Z₁  (DRIVE)</div>
      <button class="export-btn ready" onclick={() => exportSVG(gs.g1, 'Z1-drive')}>EXPORT SVG</button>
      <button class="export-btn dxf"   onclick={() => exportDXF(gs.g1, 'Z1-drive')}>EXPORT DXF</button>
    </section>

    <section class="panel-section">
      <div class="section-label">EXPORT  Z₂  (DRIVEN)</div>
      <button class="export-btn ready" onclick={() => exportSVG(gs.g2, 'Z2-driven')}>EXPORT SVG</button>
      <button class="export-btn dxf"   onclick={() => exportDXF(gs.g2, 'Z2-driven')}>EXPORT DXF</button>
    </section>

    {#if gs.g3}
      <section class="panel-section">
        <div class="section-label">EXPORT  Z₃  (OUTPUT)</div>
        <button class="export-btn ready" onclick={() => exportSVG(gs.g3!, 'Z3-output')}>EXPORT SVG</button>
        <button class="export-btn dxf"   onclick={() => exportDXF(gs.g3!, 'Z3-output')}>EXPORT DXF</button>
      </section>
    {/if}

    <section class="panel-section">
      <div class="section-label">3D EXPORT  Z₁</div>
      <button class="export-btn ready" onclick={() => downloadGearSTL(gs.g1, p.faceWidth, p.helixAngle, p.holeD, 'Z1-drive', p.shaftType, p.dFlatDepth)}>EXPORT STL</button>
      <button class="export-btn dxf"   onclick={() => downloadGearOBJ(gs.g1, p.faceWidth, p.helixAngle, p.holeD, 'Z1-drive', p.shaftType, p.dFlatDepth)}>EXPORT OBJ</button>
      <div class="export-sub">{p.gearSubtype === 'helical' ? `Helical ${p.helixAngle}°` : 'Spur'} · {p.faceWidth}mm face</div>
    </section>

    <section class="panel-section">
      <div class="section-label">3D EXPORT  Z₂</div>
      <button class="export-btn ready" onclick={() => downloadGearSTL(gs.g2, p.faceWidth, p.helixAngle, p.holeD, 'Z2-driven', p.shaftType, p.dFlatDepth)}>EXPORT STL</button>
      <button class="export-btn dxf"   onclick={() => downloadGearOBJ(gs.g2, p.faceWidth, p.helixAngle, p.holeD, 'Z2-driven', p.shaftType, p.dFlatDepth)}>EXPORT OBJ</button>
      <div class="export-sub">{p.gearSubtype === 'helical' ? `Helical ${p.helixAngle}°` : 'Spur'} · {p.faceWidth}mm face</div>
    </section>

    {#if gs.g3}
      <section class="panel-section">
        <div class="section-label">3D EXPORT  Z₃</div>
        <button class="export-btn ready" onclick={() => downloadGearSTL(gs.g3!, p.faceWidth, p.helixAngle, p.holeD, 'Z3-output', p.shaftType, p.dFlatDepth)}>EXPORT STL</button>
        <button class="export-btn dxf"   onclick={() => downloadGearOBJ(gs.g3!, p.faceWidth, p.helixAngle, p.holeD, 'Z3-output', p.shaftType, p.dFlatDepth)}>EXPORT OBJ</button>
        <div class="export-sub">{p.gearSubtype === 'helical' ? `Helical ${p.helixAngle}°` : 'Spur'} · {p.faceWidth}mm face</div>
      </section>
    {/if}

  {:else}

    <!-- ── PLANETARY STATS ─────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">PLANETARY STATS</div>
      <div class="readout" style="margin-bottom:12px">
        <div class="readout-cell">
          <div class="readout-label">RATIO</div>
          <div class="readout-value">{Math.abs(ps.ratio).toFixed(4)}</div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">Nr (RING)</div>
          <div class="readout-value">{ps.Nr}</div>
        </div>
      </div>
      <div class="stat-row">
        <span class="stat-key">ORBIT RADIUS</span>
        <span class="stat-val">{ps.Csp.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">RING OD</span>
        <span class="stat-val">{ps.gRing.size.toFixed(1)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">MODULE</span>
        <span class="stat-val">{p.module}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">SPACING</span>
        <span class="stat-val" style="color:{ps.spacingValid ? 'var(--green)' : 'var(--orange)'}">
          {ps.spacingValid ? 'VALID' : 'UNEQUAL'}
        </span>
      </div>
    </section>

    <!-- ── PLANETARY RPM ──────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">RPM  READOUT</div>
      <div class="rpm-row">
        <span class="rpm-label">SUN  (IN)</span>
        <span class="rpm-val">{sunRPM.toFixed(1)}</span>
        <span class="rpm-unit">RPM</span>
      </div>
      <div class="rpm-row" style="color:{p.planetaryFixed === 'carrier' ? 'var(--g300)' : 'inherit'}">
        <span class="rpm-label">CARRIER{p.planetaryFixed === 'carrier' ? '  FIXED' : '  (OUT)'}</span>
        <span class="rpm-val">{Math.abs(carrierRPM).toFixed(2)}</span>
        <span class="rpm-unit">RPM</span>
      </div>
      <div class="rpm-row" style="color:{p.planetaryFixed === 'ring' ? 'var(--g300)' : 'inherit'}">
        <span class="rpm-label">RING{p.planetaryFixed === 'ring' ? '  FIXED' : '  (OUT)'}</span>
        <span class="rpm-val">{Math.abs(ringRPM).toFixed(2)}</span>
        <span class="rpm-unit">RPM  {ringRPM < 0 ? '⟲ REV' : ''}</span>
      </div>
    </section>

    <!-- ── PLANETARY EXPORT ───────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">EXPORT  SUN  Zs={p.Nsun}</div>
      <button class="export-btn ready" onclick={() => exportSVG(ps.gSun, `sun-Zs${p.Nsun}`)}>EXPORT SVG</button>
      <button class="export-btn dxf"   onclick={() => exportDXF(ps.gSun, `sun-Zs${p.Nsun}`)}>EXPORT DXF</button>
    </section>

    <section class="panel-section">
      <div class="section-label">EXPORT  PLANET  Zp={p.Nplanet}</div>
      <button class="export-btn ready" onclick={() => exportSVG(ps.gPlanet, `planet-Zp${p.Nplanet}`)}>EXPORT SVG</button>
      <button class="export-btn dxf"   onclick={() => exportDXF(ps.gPlanet, `planet-Zp${p.Nplanet}`)}>EXPORT DXF</button>
      <div class="export-sub">×{p.Nplanets} planets needed</div>
    </section>

    <section class="panel-section">
      <div class="section-label">EXPORT  RING  Zr={ps.Nr}</div>
      <button class="export-btn ready" onclick={() => exportSVG(ps.gRing, `ring-Zr${ps.Nr}`)}>EXPORT SVG</button>
      <button class="export-btn dxf"   onclick={() => exportDXF(ps.gRing, `ring-Zr${ps.Nr}`)}>EXPORT DXF</button>
    </section>

    <section class="panel-section">
      <div class="section-label">3D EXPORT  SUN</div>
      <button class="export-btn ready" onclick={() => downloadGearSTL(ps.gSun, p.faceWidth, p.helixAngle, p.holeD, `sun-Zs${p.Nsun}`)}>EXPORT STL</button>
      <button class="export-btn dxf"   onclick={() => downloadGearOBJ(ps.gSun, p.faceWidth, p.helixAngle, p.holeD, `sun-Zs${p.Nsun}`)}>EXPORT OBJ</button>
    </section>

    <section class="panel-section">
      <div class="section-label">3D EXPORT  PLANET  (×{p.Nplanets})</div>
      <button class="export-btn ready" onclick={() => downloadGearSTL(ps.gPlanet, p.faceWidth, p.helixAngle, p.holeD, `planet-Zp${p.Nplanet}`)}>EXPORT STL</button>
      <button class="export-btn dxf"   onclick={() => downloadGearOBJ(ps.gPlanet, p.faceWidth, p.helixAngle, p.holeD, `planet-Zp${p.Nplanet}`)}>EXPORT OBJ</button>
    </section>

  {/if}

</div>

<style>
  .rpm-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 0;
    border-bottom: 1px solid var(--g100);
  }
  .rpm-label {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--g600);
    flex: 1;
  }
  .rpm-val {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--black);
    letter-spacing: 0.04em;
  }
  .rpm-unit {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--g500);
    min-width: 52px;
  }
  .export-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    letter-spacing: 0.04em;
    margin-top: 5px;
  }
</style>
