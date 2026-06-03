<script lang="ts">
  import { onMount } from 'svelte';
  import { Gear } from '@dromney/gear-gen';
  import { rackPath } from '$modules/gears/rack';
  import { gearFab } from '$stores/gears.svelte';

  interface Props { blueprint?: boolean; }
  const { blueprint = false }: Props = $props();

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

  const p = $derived(gearFab.params);

  // Pinion gear object (standalone, no parent)
  const pinion = $derived.by(() =>
    new Gear({ N: p.Npinion, D: p.Npinion * p.module, PADeg: p.PADeg, scale: 1 })
  );

  // Layout: fit rack width + 2× pinion diameter in viewport
  const rackW    = $derived(p.rackTeeth * Math.PI * p.module);
  const pinionR  = $derived(pinion.r);
  const rackBackH = $derived(p.module * 3);

  const dispScale = $derived.by(() => {
    const totalH = pinionR * 2 + (pinionR + 1.25 * p.module + rackBackH) + 40;
    const totalW = rackW + 40;
    return Math.min((cw - 48) / totalW, (ch - 48) / totalH, 20);
  });

  // Screen centres
  const cx = $derived(cw / 2);
  const cy = $derived(ch / 2 - (pinionR + 1.25 * p.module + rackBackH) * dispScale / 2);

  // Animation — pinion angle, rack translates accordingly
  let pinionAngle = $state(0);
  let raf: number;
  onMount(() => {
    const tick = () => {
      raf = requestAnimationFrame(tick);
      pinionAngle += p.inputRPM / 10;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // Rack offset: rack moves left by arc-length as pinion rotates clockwise.
  // + pitch/4 phase correction: at pinionAngle=0, the tooth nearest the contact
  // point sits π*module/4 away from the rack gap centre — shift rack to align.
  const rackOffset = $derived(-(pinionAngle * Math.PI / 180) * pinionR + Math.PI * p.module / 4);

  // Rack is centred so it wraps: offset mod rackW
  const rackOffsetWrapped = $derived(((rackOffset % rackW) + rackW) % rackW - rackW / 2);

  function borePath(r: number): string {
    if (r <= 0) return '';
    if (p.shaftType === 'D' && p.dFlatDepth > 0 && p.dFlatDepth < r * 2) {
      const flatX     = r - p.dFlatDepth;
      const flatHalfY = Math.sqrt(Math.max(0, r * r - flatX * flatX));
      return `M${flatX.toFixed(4)},${(-flatHalfY).toFixed(4)}`
           + ` A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 ${flatX.toFixed(4)},${flatHalfY.toFixed(4)} Z`;
    }
    return `M${r.toFixed(4)},0 A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 -${r.toFixed(4)},0`
         + ` A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 ${r.toFixed(4)},0 Z`;
  }

  // Pinion tooth profile + bore hole
  const pinionPath = $derived.by(() => {
    const pts = pinion.pointsLinear;
    const profile = 'M' + pts.map(pt => `${pt.x.toFixed(4)},${pt.y.toFixed(4)}`).join(' ') + 'Z';
    const r = p.holeD / 2;
    if (r <= 0) return profile;
    const hole = borePath(r);
    return profile + ' ' + hole;
  });

  // Rack SVG path (origin = pitch-line left edge, y-down)
  const rackSvgPath = $derived(rackPath(p.rackTeeth, p.module, p.PADeg, rackBackH));

  const sw = $derived(0.5 / dispScale);

  // Linear speed of rack
  const rackSpeedMmPerSec = $derived((p.inputRPM / 60) * 2 * Math.PI * pinionR);
  const rackY_screen = $derived(cy + pinionR * dispScale);

  // Theme
  const theme = $derived(blueprint
    ? {
        bg:         '#0D1B2A',
        pinionFill: 'rgba(13,71,161,0.4)',
        rackFill:   'rgba(0,55,130,0.35)',
        stroke:     '#4DB8FF',
        axisColor:  'rgba(77,184,255,0.3)',
        pitchColor: 'rgba(77,184,255,0.4)',
        textFill:   '#4DB8FF',
        badge:      'rgba(77,184,255,0.6)',
      }
    : {
        bg:         '#F6F5F3',
        pinionFill: '#E8E7E4',
        rackFill:   '#EDECE9',
        stroke:     '#0C0C0B',
        axisColor:  '#E2E1DC',
        pitchColor: '#CCCBC7',
        textFill:   'var(--g500)',
        badge:      'var(--g400)',
      }
  );
</script>

<div class="rack-view" bind:this={container} style="background:{theme.bg}">
  <svg width={cw} height={ch} viewBox="0 0 {cw} {ch}">

    {#if blueprint}
      <defs>
        <pattern id="bp-grid-r" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(77,184,255,0.08)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width={cw} height={ch} fill="url(#bp-grid-r)"/>
    {/if}

    <!-- Guide rail lines -->
    <line x1="0" y1={rackY_screen} x2={cw} y2={rackY_screen}
      stroke={theme.axisColor} stroke-width="0.5" stroke-dasharray="4,3"/>
    <line x1="0" y1={rackY_screen + (1.25 * p.module + rackBackH) * dispScale}
          x2={cw} y2={rackY_screen + (1.25 * p.module + rackBackH) * dispScale}
      stroke={theme.axisColor} stroke-width="0.5"/>

    <!-- Pitch circle -->
    <circle cx={cx} cy={cy} r={pinionR * dispScale}
      fill="none" stroke={theme.pitchColor} stroke-width="0.5" stroke-dasharray="4,3"/>

    <!-- Rack body — clip to viewport, rendered at two offsets for seamless wrap -->
    {#each [-rackW, 0, rackW] as extraOffset}
      {@const rackX = cx - rackW * dispScale / 2 + rackOffsetWrapped * dispScale + extraOffset * dispScale}
      {@const rackTranslateY = cy + pinionR * dispScale}
      <g transform="translate({rackX},{rackTranslateY}) scale({dispScale})">
        <path d={rackSvgPath} fill={theme.rackFill} stroke={theme.stroke}
          stroke-width={sw} stroke-linejoin="round"/>
      </g>
    {/each}

    <!-- Pinion -->
    <g transform="translate({cx},{cy}) scale({dispScale}) rotate({pinionAngle + pinion.baseAngle})">
      <path d={pinionPath} fill={theme.pinionFill} stroke={theme.stroke}
        stroke-width={sw} fill-rule="evenodd" stroke-linejoin="round"/>
    </g>

    <!-- Centre dot -->
    <circle cx={cx} cy={cy} r="3" fill={theme.textFill}/>

    <!-- Labels -->
    <text x={cx} y={cy - pinionR * dispScale - 12} text-anchor="middle"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.textFill} letter-spacing="0.1em">PINION  Zp={p.Npinion}</text>

    <!-- Stats (bottom right) -->
    <text x={cw - 16} y={ch - 46} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badge} letter-spacing="0.08em">PINION  {p.inputRPM.toFixed(1)} RPM</text>
    <text x={cw - 16} y={ch - 30} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badge} letter-spacing="0.08em">RACK  {rackSpeedMmPerSec.toFixed(1)} mm/s</text>
    <text x={cw - 16} y={ch - 14} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badge} letter-spacing="0.08em">PITCH  {(Math.PI * p.module).toFixed(3)} mm</text>
  </svg>
</div>

<style>
  .rack-view { position: absolute; inset: 0; overflow: hidden; }
</style>
