<script lang="ts">
  import { kineticFab } from '$stores/kinetic.svelte';
  import {
    crankDiscSVG, connectingRodSVG, fourBarLinkSVG, fourBarAssemblySVG, downloadSVGPart,
    grashofClass, fourBarState,
  } from '$modules/kinetic/mechanisms';

  const p = $derived(kineticFab.params);

  const stroke     = $derived(p.crankR * 2);
  const outerR     = $derived(p.crankR + p.pinHoleD + 6);
  const crankOD    = $derived((outerR * 2).toFixed(1));
  const isCSM      = $derived(p.mechanism === 'crank-slider');
  const isFourBar  = $derived(p.mechanism === 'four-bar');

  const grashof = $derived(
    isFourBar ? grashofClass(p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground) : null
  );

  const minTransmAngle = $derived.by(() => {
    if (!isFourBar) return 90;
    let minT = 180;
    for (let a = 0; a < 360; a += 3) {
      const st = fourBarState(a, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, 0, 0);
      if (st.valid) minT = Math.min(minT, st.transmAngle);
    }
    return minT >= 180 ? 0 : minT;
  });

  function transmColor(t: number): string {
    if (t >= 40) return 'var(--green)';
    if (t >= 20) return 'var(--orange)';
    return 'var(--red)';
  }

  function exportLink(length: number, filename: string) {
    const svg = fourBarLinkSVG(length, p.pinHoleD, p.thickness);
    downloadSVGPart(svg, filename);
  }
</script>

<div class="panel-right">

  {#if isFourBar}
    <!-- ── FOUR-BAR: link readouts ─────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">LINK LENGTHS</div>
      <div class="readout" style="margin-bottom:12px">
        <div class="readout-cell">
          <div class="readout-label">CRANK a</div>
          <div class="readout-value">{p.fb_crank}<span class="unit">mm</span></div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">COUPLER b</div>
          <div class="readout-value">{p.fb_coupler}<span class="unit">mm</span></div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">FOLLOWER c</div>
          <div class="readout-value">{p.fb_follower}<span class="unit">mm</span></div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">GROUND d</div>
          <div class="readout-value">{p.fb_ground}<span class="unit">mm</span></div>
        </div>
      </div>

      {#if grashof}
        <div class="stat-row">
          <span class="stat-key">GRASHOF</span>
          <span class="stat-val" style="color:{grashof.satisfied ? 'var(--green)' : 'var(--orange)'}">
            {grashof.satisfied ? 'SATISFIED' : 'NOT SAT.'}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-key">CLASS</span>
          <span class="stat-val" style="color:{grashof.crankRotates ? 'var(--green)' : 'var(--orange)'}">
            {grashof.grashofClass.toUpperCase()}
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
        <span class="stat-key">BRANCH</span>
        <span class="stat-val">{p.fb_branch.toUpperCase()}</span>
      </div>

      <div class="stat-row">
        <span class="stat-key">PIN BORE Ø</span>
        <span class="stat-val">{p.pinHoleD}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">MATERIAL t</span>
        <span class="stat-val">{p.thickness}<span class="unit"> mm</span></span>
      </div>
    </section>

    <!-- ── EXPORT LINKS ──────────────────────────────────────────────── -->
    <section class="panel-section">
      <div class="section-label">EXPORT LINKS</div>

      <button class="export-btn ready"
        onclick={() => exportLink(p.fb_crank, `link_crank_${p.fb_crank}mm.svg`)}
      >EXPORT CRANK SVG</button>
      <div class="export-sub">Link AB · {p.fb_crank} mm c-c</div>

      <button class="export-btn ready" style="margin-top:8px"
        onclick={() => exportLink(p.fb_coupler, `link_coupler_${p.fb_coupler}mm.svg`)}
      >EXPORT COUPLER SVG</button>
      <div class="export-sub">Link BC · {p.fb_coupler} mm c-c</div>

      <button class="export-btn ready" style="margin-top:8px"
        onclick={() => exportLink(p.fb_follower, `link_follower_${p.fb_follower}mm.svg`)}
      >EXPORT FOLLOWER SVG</button>
      <div class="export-sub">Link CD · {p.fb_follower} mm c-c</div>

      <div class="export-hint">Capsule body + pin holes<br>fill-rule evenodd · mm calibrated</div>

      <button class="export-btn ready" style="margin-top:12px"
        onclick={() => downloadSVGPart(fourBarAssemblySVG(p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.pinHoleD, p.thickness), 'fourbar_assembly.svg')}
      >EXPORT ASSEMBLY SVG</button>
      <div class="export-sub">All 4 links on one sheet · Ø{p.pinHoleD}mm bore</div>
    </section>

  {:else}
    <!-- ── CRANK-SLIDER / SCOTCH-YOKE: original stats ────────────────── -->
    <section class="panel-section">
      <div class="section-label">MECHANISM STATS</div>
      <div class="readout" style="margin-bottom:12px">
        <div class="readout-cell">
          <div class="readout-label">STROKE</div>
          <div class="readout-value">{stroke}<span class="unit">mm</span></div>
        </div>
        <div class="readout-cell">
          <div class="readout-label">CRANK R</div>
          <div class="readout-value">{p.crankR}<span class="unit">mm</span></div>
        </div>
      </div>

      <div class="stat-row">
        <span class="stat-key">MECHANISM</span>
        <span class="stat-val">{p.mechanism === 'crank-slider' ? 'CRANK SLIDER' : 'SCOTCH YOKE'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">CRANK DISC Ø</span>
        <span class="stat-val">{crankOD}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">SHAFT BORE Ø</span>
        <span class="stat-val">{p.crankHoleD}<span class="unit"> mm</span></span>
      </div>
      <div class="stat-row">
        <span class="stat-key">PIN BORE Ø</span>
        <span class="stat-val">{p.pinHoleD}<span class="unit"> mm</span></span>
      </div>
      {#if isCSM}
        <div class="stat-row">
          <span class="stat-key">ROD LENGTH</span>
          <span class="stat-val">{p.rodLength}<span class="unit"> mm</span></span>
        </div>
      {/if}
      <div class="stat-row">
        <span class="stat-key">MATERIAL t</span>
        <span class="stat-val">{p.thickness}<span class="unit"> mm</span></span>
      </div>
    </section>

    <section class="panel-section">
      <div class="section-label">EXPORT CRANK DISC</div>
      <button class="export-btn ready"
        onclick={() => downloadSVGPart(crankDiscSVG(p), `crank_r${p.crankR}.svg`)}
      >EXPORT SVG</button>
      <div class="export-sub">Outer + centre bore + pin hole<br>fill-rule evenodd · mm calibrated</div>
    </section>

    {#if isCSM}
      <section class="panel-section">
        <div class="section-label">EXPORT CONNECTING ROD</div>
        <button class="export-btn ready"
          onclick={() => downloadSVGPart(connectingRodSVG(p), `rod_L${p.rodLength}.svg`)}
        >EXPORT SVG</button>
        <div class="export-sub">Capsule body + pin holes<br>fill-rule evenodd · mm calibrated</div>
      </section>
    {/if}
  {/if}

</div>

<style>
  .export-hint {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--g400);
    line-height: 1.6;
    margin-top: 8px;
  }
</style>
