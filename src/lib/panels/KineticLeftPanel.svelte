<script lang="ts">
  import NumInput   from '$lib/components/NumInput.svelte';
  import SegControl from '$lib/components/SegControl.svelte';
  import { kineticFab } from '$stores/kinetic.svelte';
  import { MECHANISM_LABELS, type MechanismType } from '$modules/kinetic/types';
  import { fourBarState, grashofClass } from '$modules/kinetic/mechanisms';

  const p = $derived(kineticFab.params);

  const mechOpts = (['crank-slider', 'scotch-yoke', 'four-bar'] as MechanismType[]).map(v => ({
    value: v, label: MECHANISM_LABELS[v],
  }));

  const branchOpts = [
    { value: 'open' as const,    label: 'OPEN'    },
    { value: 'crossed' as const, label: 'CROSSED' },
  ];

  const stroke = $derived(p.crankR * 2);

  const grashof = $derived(grashofClass(p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground));

  const grashofLabel = $derived.by(() => {
    const cls = grashof.grashofClass.toUpperCase().replace('-', '-');
    return grashof.satisfied ? `GRASHOF · ${cls}` : `NON-GRASHOF · ${grashof.grashofClass.toUpperCase()}`;
  });

  const grashofColor = $derived(grashof.crankRotates ? 'var(--green)' : 'var(--orange)');

  // Current-angle transmission for the analysis readout
  const analysisState = $derived(
    fourBarState(0, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, 0, 0)
  );

  // Min transmission angle over full cycle
  const minTransmAngle = $derived.by(() => {
    let minT = 180;
    for (let a = 0; a < 360; a += 3) {
      const st = fourBarState(a, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, 0, 0);
      if (st.valid) minT = Math.min(minT, st.transmAngle);
    }
    return minT >= 180 ? 0 : minT;
  });

  function transmColor(angle: number): string {
    if (angle >= 40) return 'var(--green)';
    if (angle >= 20) return 'var(--orange)';
    return 'var(--red)';
  }

  function applyPreset(preset: { fb_crank: number; fb_coupler: number; fb_follower: number; fb_ground: number; fb_coupler_p: number; fb_coupler_q: number }) {
    kineticFab.update({ ...preset, fb_branch: 'open' });
  }
</script>

<div class="panel-left">

  <section class="panel-section">
    <div class="section-label">MECHANISM</div>
    <SegControl
      options={mechOpts}
      value={p.mechanism}
      onchange={(v) => kineticFab.update({ mechanism: v as MechanismType })}
    />
  </section>

  {#if p.mechanism === 'four-bar'}

    <!-- LINK LENGTHS -->
    <section class="panel-section">
      <div class="section-label">LINK LENGTHS</div>
      <NumInput label="CRANK AB"    value={p.fb_crank}    min={5}  max={300} step={1} unit="mm" onchange={v => kineticFab.update({ fb_crank: v })} />
      <NumInput label="COUPLER BC"  value={p.fb_coupler}  min={10} max={500} step={1} unit="mm" onchange={v => kineticFab.update({ fb_coupler: v })} />
      <NumInput label="FOLLOWER CD" value={p.fb_follower} min={10} max={500} step={1} unit="mm" onchange={v => kineticFab.update({ fb_follower: v })} />
      <NumInput label="GROUND AD"   value={p.fb_ground}   min={10} max={500} step={1} unit="mm" onchange={v => kineticFab.update({ fb_ground: v })} />
      <div class="grashof-badge" style="color:{grashofColor}">
        {grashofLabel}
      </div>
    </section>

    <!-- COUPLER POINT -->
    <section class="panel-section">
      <div class="section-label">COUPLER POINT</div>
      <NumInput
        label="POINT P"
        value={p.fb_coupler_p}
        min={0} max={p.fb_coupler * 1.5} step={1} unit="mm"
        onchange={v => kineticFab.update({ fb_coupler_p: v })}
      />
      <NumInput
        label="OFFSET Q"
        value={p.fb_coupler_q}
        min={-100} max={100} step={1} unit="mm"
        onchange={v => kineticFab.update({ fb_coupler_q: v })}
      />
      <div class="hint-text">P traces coupler curve</div>
    </section>

    <!-- BRANCH -->
    <section class="panel-section">
      <div class="section-label">BRANCH</div>
      <SegControl
        options={branchOpts}
        value={p.fb_branch}
        onchange={(v) => kineticFab.update({ fb_branch: v as 'open' | 'crossed' })}
      />
    </section>

    <!-- ANALYSIS -->
    <section class="panel-section">
      <div class="section-label">ANALYSIS</div>
      {#if analysisState.valid}
        <div class="stat-row">
          <span class="stat-key">TRANSMISSION</span>
          <span class="stat-val" style="color:{transmColor(analysisState.transmAngle)}">
            {analysisState.transmAngle.toFixed(0)}<span class="unit"> °</span>
          </span>
        </div>
      {/if}
      <div class="stat-row">
        <span class="stat-key">MIN TRANSM</span>
        <span class="stat-val" style="color:{transmColor(minTransmAngle)}">
          {minTransmAngle.toFixed(0)}<span class="unit"> °</span>
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-key">GRASHOF</span>
        <span class="stat-val" style="color:{grashofColor}">
          {grashof.satisfied ? 'SATISFIED' : 'NOT SATISFIED'}
        </span>
      </div>
    </section>

    <!-- PRESETS -->
    <section class="panel-section">
      <div class="section-label">PRESETS</div>
      <button class="preset-btn" onclick={() => applyPreset({ fb_crank: 30, fb_coupler: 80, fb_follower: 60, fb_ground: 90,  fb_coupler_p: 40, fb_coupler_q: 0  })}>CRANK-ROCKER</button>
      <button class="preset-btn" onclick={() => applyPreset({ fb_crank: 80, fb_coupler: 90, fb_follower: 50, fb_ground: 60,  fb_coupler_p: 45, fb_coupler_q: 0  })}>DRAG-LINK</button>
      <button class="preset-btn" onclick={() => applyPreset({ fb_crank: 50, fb_coupler: 125, fb_follower: 50, fb_ground: 100, fb_coupler_p: 62, fb_coupler_q: 70 })}>STRAIGHT-LINE</button>
    </section>

    <!-- ANIMATION -->
    <section class="panel-section">
      <div class="section-label">ANIMATION</div>
      <NumInput label="ANIM SPEED" value={p.animSpeed} min={0} max={5} step={0.1} unit="°/f" onchange={v => kineticFab.update({ animSpeed: v })} />
    </section>

  {:else}

    <!-- CRANK -->
    <section class="panel-section">
      <div class="section-label">CRANK</div>
      <NumInput label="CRANK RADIUS" value={p.crankR}     min={5}  max={200} step={1}   unit="mm" onchange={v => kineticFab.update({ crankR: v })} />
      <NumInput label="SHAFT BORE Ø" value={p.crankHoleD} min={2}  max={30}  step={0.5} unit="mm" onchange={v => kineticFab.update({ crankHoleD: v })} />
      <NumInput label="PIN BORE Ø"   value={p.pinHoleD}   min={2}  max={20}  step={0.5} unit="mm" onchange={v => kineticFab.update({ pinHoleD: v })} />
      <div class="stat-row" style="margin-top:10px">
        <span class="stat-key">STROKE</span>
        <span class="stat-val">{stroke}<span class="unit"> mm</span></span>
      </div>
    </section>

    {#if p.mechanism === 'crank-slider'}
      <section class="panel-section">
        <div class="section-label">CONNECTING ROD</div>
        <NumInput label="ROD LENGTH" value={p.rodLength} min={p.crankR * 2} max={500} step={5} unit="mm" onchange={v => kineticFab.update({ rodLength: v })} />
        <div class="stat-row" style="margin-top:10px">
          <span class="stat-key">ROD : CRANK</span>
          <span class="stat-val">{(p.rodLength / p.crankR).toFixed(2)}<span class="unit"> ×</span></span>
        </div>
        <div class="stat-row">
          <span class="stat-key">MOTION TYPE</span>
          <span class="stat-val">{p.rodLength / p.crankR > 3.5 ? 'NEAR SINE' : 'ELLIPTIC'}</span>
        </div>
      </section>
    {:else}
      <section class="panel-section">
        <div class="section-label">SCOTCH YOKE</div>
        <div class="stat-row">
          <span class="stat-key">MOTION TYPE</span>
          <span class="stat-val">PURE SINE</span>
        </div>
        <div class="stat-row">
          <span class="stat-key">STROKE</span>
          <span class="stat-val">{stroke}<span class="unit"> mm</span></span>
        </div>
        <div class="hint-text">
          Produces perfect sinusoidal motion.
          Used in high-speed engines, oscilloscopes.
        </div>
      </section>
    {/if}

    <!-- MATERIAL + ANIMATION -->
    <section class="panel-section">
      <div class="section-label">MATERIAL + ANIMATION</div>
      <NumInput label="MATERIAL t" value={p.thickness} min={1} max={25} step={0.5} unit="mm" onchange={v => kineticFab.update({ thickness: v })} />
      <NumInput label="ANIM SPEED" value={p.animSpeed} min={0} max={5}  step={0.1} unit="°/f" onchange={v => kineticFab.update({ animSpeed: v })} />
    </section>

  {/if}

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

  .grashof-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    margin-top: 10px;
    padding: 5px 0;
    border-top: 1px solid var(--g100);
  }

  .preset-btn {
    display: block;
    width: 100%;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 7px 10px;
    margin-bottom: 4px;
    background: var(--g50);
    border: 1px solid var(--g200);
    border-radius: var(--radius);
    color: var(--g700);
    cursor: pointer;
    transition: background 0.1s;
  }

  .preset-btn:hover {
    background: var(--g100);
  }
</style>
