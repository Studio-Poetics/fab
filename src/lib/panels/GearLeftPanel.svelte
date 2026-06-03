<script lang="ts">
  import NumInput   from '$lib/components/NumInput.svelte';
  import SegControl from '$lib/components/SegControl.svelte';
  import { gearFab } from '$stores/gears.svelte';

  const p   = $derived(gearFab.params);
  const gs  = $derived(gearFab.spur);
  const ps  = $derived(gearFab.planetary);
  const uc1 = $derived(gs.undercutG1);
  const uc2 = $derived(gs.undercutG2);

  const modeOpts = [
    { value: 'spur',      label: 'SPUR'      },
    { value: 'planetary', label: 'PLANETARY' },
    { value: 'rack',      label: 'RACK'      },
  ];

  const gearCountOpts = [
    { value: '2', label: '2 GEARS' },
    { value: '3', label: '3 GEARS' },
  ];

  const anglePairs = [
    { value: '0',   label: '→' },
    { value: '90',  label: '↑' },
    { value: '180', label: '←' },
    { value: '270', label: '↓' },
  ];

  const fixedOpts = [
    { value: 'ring',    label: 'RING FIXED'    },
    { value: 'carrier', label: 'CARRIER FIXED' },
  ];

  const shaftOpts = [
    { value: 'round', label: 'ROUND' },
    { value: 'D',     label: 'D-SHAFT' },
  ];

  const subtypeOpts = [
    { value: 'spur',    label: 'SPUR'     },
    { value: 'helical', label: 'HELICAL'  },
    { value: 'bevel',   label: 'BEVEL ··' },
    { value: 'cycloid', label: 'CYCLOID ··' },
  ];

  const positionOpts = [
    { value: 'std',      label: 'STANDARD'  },
    { value: 'backlash', label: 'BACKLASH ·' },
  ];

  const nplanetsOpts = [
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '6', label: '6' },
  ];

  function setCount(v: unknown) {
    gearFab.update({ N3: (v as string) === '3' ? 16 : null });
  }

  // Find nearest Nsun that satisfies equal-spacing: (Ns + Nr) % Nplanets === 0
  // Nr = Ns + 2*Np → (2*Ns + 2*Np) % Nplanets === 0 → 2*(Ns+Np) % Nplanets === 0
  function nearestValidNsun(Ns: number, Np: number, Npl: number): number {
    for (let delta = 0; delta <= 20; delta++) {
      if ((2 * (Ns + delta + Np)) % Npl === 0) return Ns + delta;
      if (delta > 0 && Ns - delta >= 6 && (2 * (Ns - delta + Np)) % Npl === 0) return Ns - delta;
    }
    return Ns;
  }

  function autoFixSpacing() {
    const fixed = nearestValidNsun(p.Nsun, p.Nplanet, p.Nplanets);
    gearFab.update({ Nsun: fixed });
  }
  function setAngle2(v: unknown) {
    const n = parseInt(v as string);
    if (!isNaN(n)) gearFab.update({ angle2: n });
  }
  function setAngle3(v: unknown) {
    const n = parseInt(v as string);
    if (!isNaN(n)) gearFab.update({ angle3: n });
  }
</script>

<div class="panel-left">

  <!-- ── GEAR MODE ─────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">GEAR MODE</div>
    <SegControl
      options={modeOpts}
      value={p.gearMode}
      onchange={v => gearFab.update({ gearMode: v as 'spur' | 'planetary' })}
    />
  </section>

  {#if p.gearMode === 'spur'}

    <!-- ── SPUR TRAIN ────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">GEAR TRAIN</div>
      <SegControl options={gearCountOpts} value={p.N3 === null ? '2' : '3'} onchange={setCount} />
    </section>

    <section class="panel-section">
      <div class="section-label">DRIVE GEAR  Z₁</div>
      <NumInput label="TEETH" value={p.N1} min={6} max={200} step={1} unit="" onchange={v => gearFab.update({ N1: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{gs.g1.D.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">OUTER Ø</span>
        <span class="stat-val">{gs.g1.dOuter.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-label">DRIVEN GEAR  Z₂{p.internalG2 ? '  (RING)' : ''}</div>
      <NumInput label="TEETH" value={p.N2} min={p.internalG2 ? p.N1 + 6 : 6} max={200} step={1} unit="" onchange={v => gearFab.update({ N2: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{gs.g2.D.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">RATIO  Z₁:Z₂</span>
        <span class="stat-val">{(p.N2 / p.N1).toFixed(4)}</span>
      </div>
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PLACEMENT</span>
      </div>
      <SegControl options={anglePairs} value={String(p.angle2)} onchange={setAngle2} />
    </section>

    {#if p.N3 !== null && gs.g3}
      <section class="panel-section">
        <div class="section-label">OUTPUT GEAR  Z₃</div>
        <NumInput label="TEETH" value={p.N3} min={6} max={200} step={1} unit="" onchange={v => gearFab.update({ N3: v })} />
        <div class="stat-row" style="margin-top:8px">
          <span class="stat-key">PITCH Ø</span>
          <span class="stat-val">{gs.g3.D.toFixed(2)}<span class="unit"> mm</span></span>
        </div>
        <div class="stat-row">
          <span class="stat-key">RATIO  Z₁:Z₃</span>
          <span class="stat-val">{gs.g3.totalRatio.toFixed(4)}</span>
        </div>
        <div class="stat-row" style="margin-top:8px">
          <span class="stat-key">PLACEMENT</span>
        </div>
        <SegControl options={anglePairs} value={String(p.angle3)} onchange={setAngle3} />
      </section>
    {/if}

  {:else if p.gearMode === 'planetary'}

    <!-- ── PLANETARY ──────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">PLANETARY SETUP</div>
      <SegControl options={fixedOpts} value={p.planetaryFixed}
        onchange={v => gearFab.update({ planetaryFixed: v as 'ring' | 'carrier' })} />
      <div class="stat-row" style="margin-top:10px">
        <span class="stat-key">PLANETS</span>
      </div>
      <SegControl options={nplanetsOpts} value={String(p.Nplanets)}
        onchange={v => gearFab.update({ Nplanets: parseInt(v as string) })} />
    </section>

    <section class="panel-section">
      <div class="section-label">SUN GEAR  Zs</div>
      <NumInput label="TEETH" value={p.Nsun} min={6} max={100} step={1} unit="" onchange={v => gearFab.update({ Nsun: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{ps.gSun.D.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-label">PLANET GEAR  Zp</div>
      <NumInput label="TEETH" value={p.Nplanet} min={4} max={60} step={1} unit="" onchange={v => gearFab.update({ Nplanet: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{ps.gPlanet.D.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">ORBIT Ø</span>
        <span class="stat-val">{(ps.Csp * 2).toFixed(2)}<span class="unit"> mm</span></span>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-label">RING GEAR  Zr  (COMPUTED)</div>
      <div class="stat-row">
        <span class="stat-key">TEETH  Zr</span>
        <span class="stat-val">{ps.Nr}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{ps.gRing.D.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">RATIO</span>
        <span class="stat-val">{Math.abs(ps.ratio).toFixed(4)}</span>
      </div>
      {#if !ps.spacingValid}
        <div class="hint-text warn">⚠ (Ns+Nr) % Nplanets ≠ 0 — planets unevenly spaced</div>
        <button class="fix-btn" onclick={autoFixSpacing}>AUTO-FIX SPACING</button>
      {/if}
    </section>

  {:else}

    <!-- ── RACK & PINION ─────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">PINION</div>
      <NumInput label="TEETH  Zp" value={p.Npinion} min={6} max={100} step={1} unit="" onchange={v => gearFab.update({ Npinion: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">PITCH Ø</span>
        <span class="stat-val">{(p.Npinion * p.module).toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PITCH RADIUS</span>
        <span class="stat-val">{(p.Npinion * p.module / 2).toFixed(2)}<span class="unit"> mm</span></span>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-label">RACK</div>
      <NumInput label="VISIBLE TEETH" value={p.rackTeeth} min={4} max={40} step={1} unit="" onchange={v => gearFab.update({ rackTeeth: v })} />
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">RACK LENGTH</span>
        <span class="stat-val">{(p.rackTeeth * Math.PI * p.module).toFixed(1)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PITCH</span>
        <span class="stat-val">{(Math.PI * p.module).toFixed(3)}<span class="unit"> mm</span></span>
      </div>
    </section>

  {/if}

  <!-- ── GEAR TYPE ────────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">GEAR TYPE</div>
    <SegControl options={subtypeOpts} value={p.gearSubtype}
      onchange={v => {
        const sub = v as typeof p.gearSubtype;
        if (sub === 'bevel' || sub === 'cycloid') return;
        gearFab.update({ gearSubtype: sub });
      }}
    />
    {#if p.gearSubtype === 'helical'}
      <NumInput label="HELIX ANGLE" value={p.helixAngle} min={0} max={45} step={1} unit="°"
        onchange={v => gearFab.update({ helixAngle: v })} />
    {/if}
    {#if p.gearMode === 'spur'}
      <div class="toggle-row" style="margin-top:8px">
        <label class="toggle-label">
          <input type="checkbox" checked={p.internalG2}
            onchange={e => gearFab.update({ internalG2: (e.target as HTMLInputElement).checked })}
          />
          Z₂ INSIDE-RING (INTERNAL)
        </label>
      </div>
    {/if}
    <div class="hint-text">BEVEL · CYCLOID — Phase N</div>
  </section>

  <!-- ── PROFILE MODS ──────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">PROFILE MODS</div>

    {#if p.gearMode === 'spur'}
      {#if uc1.undercut}
        <div class="hint-text warn">⚠ Z₁={uc1.N} — undercut (Nmin={uc1.Nmin})</div>
      {/if}
      {#if uc2.undercut}
        <div class="hint-text warn">⚠ Z₂={uc2.N} — undercut (Nmin={uc2.Nmin})</div>
      {/if}
      {#if !uc1.undercut && !uc2.undercut}
        <div class="hint-text ok">✓ No undercut detected</div>
      {/if}
    {:else}
      <div class="hint-text">Undercut check — spur/helical only</div>
    {/if}

    <NumInput label="PROFILE SHIFT X₁" value={p.profileShiftX1} min={-0.8} max={0.8} step={0.05} unit=""
      onchange={v => gearFab.update({ profileShiftX1: v })} />
    <NumInput label="PROFILE SHIFT X₂" value={p.profileShiftX2} min={-0.8} max={0.8} step={0.05} unit=""
      onchange={v => gearFab.update({ profileShiftX2: v })} />
    <NumInput label="ROOT FILLET ρ" value={p.rootFilletFactor} min={0} max={0.5} step={0.01} unit="×m"
      onchange={v => gearFab.update({ rootFilletFactor: v })} />

    {#if p.gearMode === 'spur' && (p.profileShiftX1 !== 0 || p.profileShiftX2 !== 0)}
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">MOD. OD  Z₁</span>
        <span class="stat-val">{gs.modOD1.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">MOD. OD  Z₂</span>
        <span class="stat-val">{gs.modOD2.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">MOD. CD</span>
        <span class="stat-val">{gs.modCD.toFixed(2)}<span class="unit"> mm</span></span>
      </div>
    {/if}

    <div class="hint-text" style="margin-top:6px">CROWNING — Phase N</div>
  </section>

  <!-- ── POSITION & ALIGNMENT ──────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">POSITION &amp; ALIGNMENT</div>
    <SegControl options={positionOpts} value={p.positionType}
      onchange={v => gearFab.update({ positionType: v as 'std' | 'backlash' })} />
    <NumInput label="BACKLASH" value={p.backlash} min={0} max={2} step={0.01} unit="mm"
      onchange={v => gearFab.update({ backlash: v })} />
    {#if p.backlash > 0}
      {@const deltaCD = p.backlash / (2 * Math.tan(p.PADeg * Math.PI / 180))}
      <div class="stat-row" style="margin-top:8px">
        <span class="stat-key">CD REDUCTION</span>
        <span class="stat-val">{deltaCD.toFixed(3)}<span class="unit"> mm</span></span>
      </div>
    {/if}
    <div class="hint-text" style="margin-top:6px">AXIS ALIGNMENT · GEARTOOTH ALIGNMENT — Phase N</div>
  </section>

  <!-- ── TOOTH FORM ─────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">TOOTH FORM</div>
    <NumInput label="MODULE"       value={p.module}    min={0.5} max={20}  step={0.5}  unit="mm" onchange={v => gearFab.update({ module: v })} />
    <NumInput label="PRESS. ANGLE" value={p.PADeg}     min={15}  max={35}  step={0.5}  unit="°"  onchange={v => gearFab.update({ PADeg: v })} />
    <NumInput label="BORE Ø"       value={p.holeD}     min={0}   max={50}  step={0.5}  unit="mm" onchange={v => gearFab.update({ holeD: v })} />
    <div class="stat-row" style="margin-top:8px"><span class="stat-key">SHAFT TYPE</span></div>
    <SegControl options={shaftOpts} value={p.shaftType}
      onchange={v => gearFab.update({ shaftType: v as 'round' | 'D' })} />
    {#if p.shaftType === 'D'}
      <NumInput label="FLAT DEPTH" value={p.dFlatDepth} min={0.1} max={p.holeD / 2} step={0.1} unit="mm"
        onchange={v => gearFab.update({ dFlatDepth: v })} />
    {/if}
    <NumInput label="MATERIAL t"   value={p.thickness} min={1}   max={25}  step={0.5}  unit="mm" onchange={v => gearFab.update({ thickness: v })} />
  </section>

  <!-- ── ANIMATION ─────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">ANIMATION</div>
    <NumInput label="INPUT RPM" value={p.inputRPM} min={0} max={600} step={1} unit="RPM" onchange={v => gearFab.update({ inputRPM: v })} />
    <div class="stat-row" style="margin-top:6px">
      <span class="stat-key">FRAME STEP</span>
      <span class="stat-val">{(p.inputRPM / 10).toFixed(2)}<span class="unit"> °/f</span></span>
    </div>
  </section>

  <!-- ── 3D PRINT ──────────────────────────────────────── -->
  <section class="panel-section">
    <div class="section-label">3D PRINT</div>
    <NumInput label="FACE WIDTH" value={p.faceWidth} min={2} max={100} step={0.5} unit="mm" onchange={v => gearFab.update({ faceWidth: v })} />
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-key">GEAR TYPE</span>
      <span class="stat-val">{p.gearSubtype === 'helical' ? 'HELICAL' : 'SPUR'}</span>
    </div>
    <div class="hint-text">Switch to 3D PRINT view to preview.</div>
  </section>

</div>

<style>
  .toggle-row {
    display: flex;
    align-items: center;
  }
  .toggle-label {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--g600);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .toggle-label input[type="checkbox"] {
    accent-color: var(--orange);
    width: 14px;
    height: 14px;
  }
  .hint-text {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--g500);
    line-height: 1.7;
    letter-spacing: 0.03em;
    margin-top: 8px;
  }
  .hint-text.warn { color: var(--orange); }
  .hint-text.ok   { color: var(--green, #1A7A3F); }
  .fix-btn {
    margin-top: 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--orange);
    background: none;
    border: 1px solid var(--orange);
    padding: 5px 10px;
    cursor: pointer;
    width: 100%;
    transition: background 0.15s, color 0.15s;
  }
  .fix-btn:hover { background: var(--orange); color: #fff; }
</style>
