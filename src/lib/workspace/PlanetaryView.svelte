<script lang="ts">
  import { onMount } from 'svelte';
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

  const p  = $derived(gearFab.params);
  const ps = $derived(gearFab.planetary);

  // Animation — sun angle increments each frame
  let sunAngle = $state(0);
  let raf: number;
  onMount(() => {
    const tick = () => {
      raf = requestAnimationFrame(tick);
      sunAngle += p.inputRPM / 10;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // Derived angles (degrees)
  const carrierAngle   = $derived(sunAngle * ps.omegaCarrier);
  const ringAngle      = $derived(sunAngle * ps.omegaRing);
  // Planet rotation relative to carrier arm.
  // omegaPlanetAbs - omegaCarrier is negative (CCW spin).
  // Add 180° so the initial tooth phase matches the sun-planet external mesh
  // (same logic as the library's getRot 180° correction for external gears).
  const planetRelAngle = $derived(sunAngle * (ps.omegaPlanetAbs - ps.omegaCarrier) + 180);

  // Layout: scale so ring gear fits with padding
  const dispScale = $derived.by(() => {
    const ringBound = ps.gRing.size / 2;
    const pad = 40;
    const available = Math.min(cw, ch) / 2 - pad;
    return available > 0 ? Math.min(available / ringBound, 20) : 1;
  });

  const cx = $derived(cw / 2);
  const cy = $derived(ch / 2);

  // Build tooth profile path from pointsLinear
  function toothPath(pts: { x: number; y: number }[]): string {
    return 'M' + pts.map(pt => `${pt.x.toFixed(4)},${pt.y.toFixed(4)}`).join(' ') + 'Z';
  }

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

  // Sun gear path (with bore hole)
  const sunPath = $derived.by(() => {
    const pts = ps.gSun.pointsLinear;
    const profile = toothPath(pts);
    const r = p.holeD / 2;
    if (r <= 0 || r >= ps.gSun.r) return profile;
    const hole = borePath(r);
    return profile + ' ' + hole;
  });

  // Planet path (single prototype; reused for all planets)
  const planetPath = $derived(toothPath(ps.gPlanet.pointsLinear));

  // Ring gear path: outer solid circle + inner tooth profile (evenodd)
  const ringPath = $derived.by(() => {
    const ro  = ps.gRing.size / 2;
    const outerCircle = `M${ro.toFixed(4)},0 A${ro.toFixed(4)},${ro.toFixed(4)} 0 1,1 -${ro.toFixed(4)},0 A${ro.toFixed(4)},${ro.toFixed(4)} 0 1,1 ${ro.toFixed(4)},0 Z`;
    const innerTeeth  = toothPath(ps.gRing.pointsLinear);
    return outerCircle + ' ' + innerTeeth;
  });

  // Planet orbit offsets (equal angular spacing)
  const planetOffsets = $derived(
    Array.from({ length: p.Nplanets }, (_, i) => (360 / p.Nplanets) * i)
  );

  const sw = $derived(0.5 / dispScale);

  // Theme
  const theme = $derived(blueprint
    ? {
        bg:         '#0D1B2A',
        sunFill:    'rgba(13,71,161,0.4)',
        planetFill: 'rgba(0,55,130,0.35)',
        ringFill:   'rgba(5,45,110,0.3)',
        stroke:     '#4DB8FF',
        pitchColor: 'rgba(77,184,255,0.35)',
        armColor:   'rgba(77,184,255,0.25)',
        textFill:   '#4DB8FF',
        dotFill:    '#4DB8FF',
        badge:      'rgba(77,184,255,0.6)',
      }
    : {
        bg:         '#F6F5F3',
        sunFill:    '#E8E7E4',
        planetFill: '#E2E1DC',
        ringFill:   '#EDECE9',
        stroke:     '#0C0C0B',
        pitchColor: '#CCCBC7',
        armColor:   '#DDD8CF',
        textFill:   'var(--g500)',
        dotFill:    'var(--g400)',
        badge:      'var(--g400)',
      }
  );

  // RPM display values
  const sunRPM     = $derived(p.inputRPM);
  const carrierRPM = $derived(p.inputRPM * ps.omegaCarrier);
  const ringRPM    = $derived(p.inputRPM * ps.omegaRing);

  const ringDisplayR = $derived(ps.gRing.size / 2 * dispScale);
</script>

<div class="planetary-view" bind:this={container} style="background:{theme.bg}">
  <svg width={cw} height={ch} viewBox="0 0 {cw} {ch}">

    {#if blueprint}
      <defs>
        <pattern id="bp-grid-p" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(77,184,255,0.08)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width={cw} height={ch} fill="url(#bp-grid-p)"/>
    {/if}

    <!-- Ring pitch circle -->
    <circle cx={cx} cy={cy} r={ps.gRing.r * dispScale}
      fill="none" stroke={theme.pitchColor} stroke-width="0.5" stroke-dasharray="4,3"/>

    <!-- Ring gear body (fixed or rotating) -->
    <g transform="translate({cx},{cy}) scale({dispScale}) rotate({ringAngle + ps.gRing.baseAngle})">
      <path d={ringPath} fill={theme.ringFill} stroke={theme.stroke}
        stroke-width={sw} fill-rule="evenodd" stroke-linejoin="round"/>
    </g>

    <!-- Carrier arms + planets (rotate together) -->
    <g transform="translate({cx},{cy}) rotate({carrierAngle})">

      <!-- Carrier arm lines -->
      {#each planetOffsets as offset}
        {@const orbitPx = ps.Csp * dispScale}
        <line
          x1="0" y1="0"
          x2={orbitPx * Math.cos(offset * Math.PI / 180)}
          y2={orbitPx * Math.sin(offset * Math.PI / 180)}
          stroke={theme.armColor} stroke-width="1" stroke-dasharray="3,2"
        />
      {/each}

      <!-- Planets -->
      {#each planetOffsets as offset}
        {@const orbitPx = ps.Csp * dispScale}
        {@const ox = orbitPx * Math.cos(offset * Math.PI / 180)}
        {@const oy = orbitPx * Math.sin(offset * Math.PI / 180)}
        <g transform="translate({ox},{oy}) scale({dispScale}) rotate({planetRelAngle + ps.gPlanet.baseAngle})">
          <path d={planetPath} fill={theme.planetFill} stroke={theme.stroke}
            stroke-width={sw} stroke-linejoin="round"/>
        </g>
        <!-- Planet pitch circle -->
        <circle
          cx={orbitPx * Math.cos(offset * Math.PI / 180)}
          cy={orbitPx * Math.sin(offset * Math.PI / 180)}
          r={ps.gPlanet.r * dispScale}
          fill="none" stroke={theme.pitchColor} stroke-width="0.4" stroke-dasharray="3,2" opacity="0.6"
        />
        <!-- Planet centre dot -->
        <circle
          cx={orbitPx * Math.cos(offset * Math.PI / 180)}
          cy={orbitPx * Math.sin(offset * Math.PI / 180)}
          r="2" fill={theme.dotFill}
        />
      {/each}
    </g>

    <!-- Sun pitch circle -->
    <circle cx={cx} cy={cy} r={ps.gSun.r * dispScale}
      fill="none" stroke={theme.pitchColor} stroke-width="0.5" stroke-dasharray="4,3"/>

    <!-- Sun gear (always rotates at input speed) -->
    <g transform="translate({cx},{cy}) scale({dispScale}) rotate({sunAngle + ps.gSun.baseAngle})">
      <path d={sunPath} fill={theme.sunFill} stroke={theme.stroke}
        stroke-width={sw} fill-rule="evenodd" stroke-linejoin="round"/>
    </g>

    <!-- Centre dot -->
    <circle cx={cx} cy={cy} r="3" fill={theme.dotFill}/>

    <!-- Gear labels -->
    <text x={cx} y={cy - ringDisplayR - 14} text-anchor="middle"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.textFill} letter-spacing="0.1em">RING  Nr={ps.Nr}</text>
    <text x={cx} y={cy - ps.gSun.rOuter * dispScale - 10} text-anchor="middle"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.textFill} letter-spacing="0.1em">SUN  Ns={p.Nsun}</text>

    {#if !ps.spacingValid}
      <text x={cx} y={cy + ringDisplayR + 20} text-anchor="middle"
        font-family="IBM Plex Mono, monospace" font-size="10"
        fill="#E85D04" letter-spacing="0.08em">SPACING WARN: (Ns+Nr)%n≠0</text>
    {/if}

    <!-- RPM readouts (bottom right) -->
    <text x={cw - 16} y={ch - 62} text-anchor="end"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.badge} letter-spacing="0.08em">SUN    {sunRPM.toFixed(1)} RPM  (IN)</text>
    <text x={cw - 16} y={ch - 46} text-anchor="end"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.badge} letter-spacing="0.08em">CARRIER  {carrierRPM.toFixed(2)} RPM  {p.planetaryFixed === 'carrier' ? '(FIXED)' : '(OUT)'}</text>
    <text x={cw - 16} y={ch - 30} text-anchor="end"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.badge} letter-spacing="0.08em">RING   {Math.abs(ringRPM).toFixed(2)} RPM  {p.planetaryFixed === 'ring' ? '(FIXED)' : '(OUT)'}</text>
    <text x={cw - 16} y={ch - 14} text-anchor="end"
      font-family="IBM Plex Mono, monospace" font-size="12"
      fill={theme.badge} letter-spacing="0.08em">RATIO  {Math.abs(ps.ratio).toFixed(4)}</text>
  </svg>
</div>

<style>
  .planetary-view { position: absolute; inset: 0; }
</style>
