<script lang="ts">
  import { onMount } from 'svelte';
  import type { Gear } from '@dromney/gear-gen';
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

  const p     = $derived(gearFab.params);
  const gs    = $derived(gearFab.spur);
  const glist = $derived(gs.g3 ? [gs.g1, gs.g2, gs.g3] : [gs.g1, gs.g2]);

  // Bounding box — internal gear uses size/2 for correct radius
  function gBound(g: Gear): number {
    return g.internal ? g.size / 2 : g.rOuter;
  }

  type Layout = { dispScale: number; offX: number; offY: number };
  const layout = $derived.by<Layout>(() => {
    let minX =  Infinity, maxX = -Infinity;
    let minY =  Infinity, maxY = -Infinity;
    for (const g of glist) {
      const b = gBound(g);
      minX = Math.min(minX, g.x - b);
      maxX = Math.max(maxX, g.x + b);
      minY = Math.min(minY, g.y - b);
      maxY = Math.max(maxY, g.y + b);
    }
    const pad = 32;
    const tw  = maxX - minX;
    const th  = maxY - minY;
    const ds  = tw > 0 && th > 0
      ? Math.min((cw - pad * 2) / tw, (ch - pad * 2) / th, 20)
      : 1;
    return {
      dispScale: ds,
      offX: cw / 2 - (minX + tw / 2) * ds,
      offY: ch / 2 - (minY + th / 2) * ds,
    };
  });

  function gearCX(g: Gear) { return g.x * layout.dispScale + layout.offX; }
  function gearCY(g: Gear) { return g.y * layout.dispScale + layout.offY; }

  // Animation — deg/frame derived from inputRPM at assumed 60fps
  let angle = $state(0);
  let raf: number;
  onMount(() => {
    const tick = () => {
      raf = requestAnimationFrame(tick);
      angle += p.inputRPM / 10;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const rots = $derived.by(() => {
    gs.g1.getRot(angle);
    gs.g2.getRot(angle);
    gs.g3?.getRot(angle);
    return glist.map(g => g.rot + g.baseAngle);
  });

  function borePath(r: number, shaftType: string, dFlatDepth: number): string {
    if (r <= 0) return '';
    if (shaftType === 'D' && dFlatDepth > 0 && dFlatDepth < r * 2) {
      const flatX     = r - dFlatDepth;
      const flatHalfY = Math.sqrt(Math.max(0, r * r - flatX * flatX));
      // Large CCW arc (large-arc=1, sweep=0) from top-flat point to bottom-flat point, close with chord
      return `M${flatX.toFixed(4)},${(-flatHalfY).toFixed(4)}`
           + ` A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 ${flatX.toFixed(4)},${flatHalfY.toFixed(4)} Z`;
    }
    return `M${r.toFixed(4)},0 A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 -${r.toFixed(4)},0`
         + ` A${r.toFixed(4)},${r.toFixed(4)} 0 1,0 ${r.toFixed(4)},0 Z`;
  }

  // Build SVG path: outer tooth profile + bore hole (evenodd)
  // For internal gears: add outer boundary circle
  function buildPath(g: Gear, holeD: number): string {
    const pts     = g.pointsLinear;
    const profile = 'M' + pts.map(pt => `${pt.x.toFixed(4)},${pt.y.toFixed(4)}`).join(' ') + 'Z';
    const r = holeD / 2;

    if (g.internal) {
      const ro  = g.size / 2;
      const outerCircle = `M${ro.toFixed(4)},0 A${ro.toFixed(4)},${ro.toFixed(4)} 0 1,1 -${ro.toFixed(4)},0 A${ro.toFixed(4)},${ro.toFixed(4)} 0 1,1 ${ro.toFixed(4)},0 Z`;
      return outerCircle + ' ' + profile;
    }

    const hole = borePath(r, p.shaftType, p.dFlatDepth);
    if (!hole) return profile;
    return profile + ' ' + hole;
  }

  const paths = $derived(glist.map(g => buildPath(g, p.holeD)));
  const sw    = $derived(0.5 / layout.dispScale);

  // Theme
  const theme = $derived(blueprint
    ? {
        bg:        '#0D1B2A',
        fill:      ['rgba(13,71,161,0.35)', 'rgba(0,55,130,0.35)', 'rgba(5,45,110,0.35)'],
        stroke:    '#4DB8FF',
        pitchStroke: 'rgba(77,184,255,0.45)',
        axisStroke:  'rgba(77,184,255,0.35)',
        textFill:    '#4DB8FF',
        dotFill:     '#4DB8FF',
        badgeFill:   'rgba(77,184,255,0.55)',
      }
    : {
        bg:        '#F6F5F3',
        fill:      ['#EDECE9', '#E8E7E4', '#E2E1DC'],
        stroke:    '#0C0C0B',
        pitchStroke: '#CCCBC7',
        axisStroke:  '#E2E1DC',
        textFill:    'var(--g500)',
        dotFill:     'var(--g400)',
        badgeFill:   'var(--g400)',
      }
  );

  // Centre distance lines between adjacent pairs
  type CdLine = { x1: number; y1: number; x2: number; y2: number; label: string };
  const cdLines = $derived.by<CdLine[]>(() => {
    const lines: CdLine[] = [];
    for (let i = 0; i < glist.length - 1; i++) {
      const a = glist[i], b = glist[i + 1];
      const cd = b.internal ? (b.r - a.r) : (a.r + b.r);
      lines.push({
        x1: gearCX(a), y1: gearCY(a),
        x2: gearCX(b), y2: gearCY(b),
        label: `CD = ${cd.toFixed(1)} mm`,
      });
    }
    return lines;
  });

  const totalRatio = $derived(glist[glist.length - 1].totalRatio);

  // RPM readouts
  const rpmG2 = $derived(-(p.inputRPM * p.N1 / p.N2));
  const rpmG3 = $derived(gs.g3 ? p.inputRPM * p.N1 / p.N3! : null);
</script>

<div class="gear-view" bind:this={container} style="background:{theme.bg}">
  <svg width={cw} height={ch} viewBox="0 0 {cw} {ch}">

    {#if blueprint}
      <!-- Blueprint grid -->
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(77,184,255,0.08)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width={cw} height={ch} fill="url(#bp-grid)"/>
    {/if}

    <!-- axis lines between gear centres -->
    {#each cdLines as cd}
      <line x1={cd.x1} y1={cd.y1} x2={cd.x2} y2={cd.y2}
        stroke={theme.axisStroke} stroke-width="0.5"/>
      <line x1={cd.x1} y1={cd.y1 - 5} x2={cd.x1} y2={cd.y1 + 5}
        stroke={theme.pitchStroke} stroke-width="0.8"/>
      <line x1={cd.x2} y1={cd.y2 - 5} x2={cd.x2} y2={cd.y2 + 5}
        stroke={theme.pitchStroke} stroke-width="0.8"/>
    {/each}

    <!-- pitch circles -->
    {#each glist as g}
      <circle
        cx={gearCX(g)} cy={gearCY(g)} r={g.r * layout.dispScale}
        fill="none" stroke={theme.pitchStroke} stroke-width="0.5" stroke-dasharray="4,3"
      />
    {/each}

    <!-- gear bodies -->
    {#each glist as g, i}
      <g transform="translate({gearCX(g)},{gearCY(g)}) scale({layout.dispScale}) rotate({rots[i]})">
        <path
          d={paths[i]}
          fill={theme.fill[i % theme.fill.length]}
          stroke={theme.stroke}
          stroke-width={sw}
          fill-rule="evenodd"
          stroke-linejoin="round"
        />
      </g>
    {/each}

    <!-- centre dots -->
    {#each glist as g}
      <circle cx={gearCX(g)} cy={gearCY(g)} r="2.5" fill={theme.dotFill}/>
    {/each}

    <!-- CD labels -->
    {#each cdLines as cd}
      {@const mx = (cd.x1 + cd.x2) / 2}
      {@const my = (cd.y1 + cd.y2) / 2}
      {@const ang = Math.atan2(cd.y2 - cd.y1, cd.x2 - cd.x1) * 180 / Math.PI}
      <text
        x={mx} y={my - 8}
        text-anchor="middle"
        font-family="IBM Plex Mono, monospace" font-size="12"
        fill={theme.textFill} letter-spacing="0.08em"
        transform="rotate({ang},{mx},{my - 8})"
      >{cd.label}</text>
    {/each}

    <!-- gear labels -->
    {#each glist as g, i}
      {@const labelNames = ['Z₁','Z₂','Z₃']}
      {@const b = gBound(g)}
      <text
        x={gearCX(g)}
        y={gearCY(g) - b * layout.dispScale - 10}
        text-anchor="middle"
        font-family="IBM Plex Mono, monospace" font-size="12"
        fill={theme.textFill} letter-spacing="0.1em"
      >{labelNames[i]} = {g.N}{g.internal ? ' (ring)' : ''}</text>
    {/each}

    <!-- RPM readout (bottom right) -->
    <text x={cw - 16} y={ch - 46} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badgeFill} letter-spacing="0.08em">Z₁  {p.inputRPM.toFixed(1)} RPM</text>
    <text x={cw - 16} y={ch - 30} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badgeFill} letter-spacing="0.08em">Z₂  {Math.abs(rpmG2).toFixed(1)} RPM {rpmG2 < 0 ? '⟲' : '⟳'}</text>
    {#if rpmG3 !== null}
      <text x={cw - 16} y={ch - 14} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badgeFill} letter-spacing="0.08em">Z₃  {Math.abs(rpmG3).toFixed(1)} RPM</text>
    {:else}
      <text x={cw - 16} y={ch - 14} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12" fill={theme.badgeFill} letter-spacing="0.08em">RATIO  {totalRatio.toFixed(4)}</text>
    {/if}
  </svg>
</div>

<style>
  .gear-view { position: absolute; inset: 0; }
</style>
