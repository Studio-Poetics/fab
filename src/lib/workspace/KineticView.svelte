<script lang="ts">
  import { onMount } from 'svelte';
  import { kineticFab } from '$stores/kinetic.svelte';
  import {
    crankSliderState, scotchYokeState, fourBarState, grashofClass,
    type FourBarState,
  } from '$modules/kinetic/mechanisms';

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

  const p = $derived(kineticFab.params);

  // Animation state
  let angle    = $state(0);
  let animDir  = $state<1 | -1>(1);
  let paused   = $state(false);
  let dragging = $state(false);

  let raf: number;
  onMount(() => {
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!paused) {
        if (p.mechanism === 'four-bar') {
          const nextAngle = (angle + p.animSpeed * animDir + 360) % 360;
          const nextState = fourBarState(nextAngle, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, p.fb_coupler_p, p.fb_coupler_q);
          if (nextState.valid) {
            angle = nextAngle;
          } else {
            // Try reversing direction once
            const retryAngle = (angle + p.animSpeed * (-animDir as 1 | -1) + 360) % 360;
            const retryState = fourBarState(retryAngle, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, p.fb_coupler_p, p.fb_coupler_q);
            if (retryState.valid) {
              animDir = (-animDir) as 1 | -1;
              angle = retryAngle;
            }
            // else stay
          }
        } else {
          angle = (angle + p.animSpeed) % 360;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // Layout scale
  const mScale = $derived.by(() => {
    let span: number, vertSpan: number;
    if (p.mechanism === 'crank-slider') {
      span = p.crankR + p.rodLength + p.crankR + 30;
      vertSpan = p.crankR * 2 + 40;
    } else if (p.mechanism === 'four-bar') {
      span     = p.fb_ground + p.fb_crank * 2 + 40;
      vertSpan = (p.fb_coupler + p.fb_follower) + 40;
    } else {
      span = p.crankR * 4 + 40;
      vertSpan = p.crankR * 2 + 40;
    }
    return Math.min((cw - 64) / span, (ch - 64) / vertSpan, 6);
  });

  // Pivot screen position for four-bar: A is left of centre, D is right
  const pivotX = $derived(
    p.mechanism === 'crank-slider'
      ? cw / 2 - (p.crankR + p.rodLength / 2) * mScale
      : p.mechanism === 'four-bar'
        ? cw / 2 - (p.fb_ground / 2) * mScale
        : cw / 2
  );
  const pivotY = $derived(ch / 2);

  // Screen coordinate helpers (mm → screen px, flipping Y)
  function sx(mmX: number) { return pivotX + mmX * mScale; }
  function sy(mmY: number) { return pivotY - mmY * mScale; }

  // Four-bar derived state
  const fbState = $derived(
    p.mechanism === 'four-bar'
      ? fourBarState(angle, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground,
                     p.fb_branch, p.fb_coupler_p, p.fb_coupler_q)
      : null
  );

  const grashof = $derived(
    p.mechanism === 'four-bar'
      ? grashofClass(p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground)
      : null
  );

  // Coupler curve trace (updates when link lengths or coupler point change)
  const couplerTrace = $derived.by(() => {
    if (p.mechanism !== 'four-bar') return '';
    const pts: string[] = [];
    let lastValid = false;
    for (let a = 0; a <= 360; a += 2) {
      const st = fourBarState(a, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground,
                               p.fb_branch, p.fb_coupler_p, p.fb_coupler_q);
      if (!st.valid) { lastValid = false; continue; }
      const cmd = lastValid ? 'L' : 'M';
      pts.push(`${cmd} ${sx(st.Px).toFixed(1)},${sy(st.Py).toFixed(1)}`);
      lastValid = true;
    }
    return pts.join(' ');
  });

  // Min transmission angle (no coupler extension — just linkage quality)
  const minTransmAngle = $derived.by(() => {
    if (p.mechanism !== 'four-bar') return 90;
    let minT = 180;
    for (let a = 0; a < 360; a += 3) {
      const st = fourBarState(a, p.fb_crank, p.fb_coupler, p.fb_follower, p.fb_ground, p.fb_branch, 0, 0);
      if (st.valid) minT = Math.min(minT, st.transmAngle);
    }
    return minT >= 180 ? 0 : minT;
  });

  // Trace path for crank/scotch
  const tracePath = $derived.by(() => {
    if (p.mechanism === 'four-bar') return '';
    const pts: string[] = [];
    for (let a = 0; a < 360; a += 4) {
      const st = p.mechanism === 'crank-slider'
        ? crankSliderState(a, p.crankR, p.rodLength)
        : scotchYokeState(a, p.crankR);
      const traceX = p.mechanism === 'crank-slider'
        ? (st as ReturnType<typeof crankSliderState>).sliderX
        : (st as ReturnType<typeof scotchYokeState>).yokeX;
      pts.push(`${a === 0 ? 'M' : 'L'} ${sx(traceX).toFixed(1)},${sy(0).toFixed(1)}`);
    }
    return pts.join(' ') + ' Z';
  });

  const pinR        = $derived(Math.max(4, p.pinHoleD / 2 * mScale));
  const shaftR      = $derived(Math.max(5, p.crankHoleD / 2 * mScale));
  const crankBodyR  = $derived(p.crankR * mScale);
  const linkW       = 8; // half-width of link bodies in screen px

  // Capsule path between two screen-coordinate points
  function capsulePath(x1: number, y1: number, x2: number, y2: number, hw: number): string {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return '';
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    return `M ${x1 + nx * hw},${y1 + ny * hw} L ${x2 + nx * hw},${y2 + ny * hw} `
         + `A ${hw},${hw} 0 0,1 ${x2 - nx * hw},${y2 - ny * hw} `
         + `L ${x1 - nx * hw},${y1 - ny * hw} `
         + `A ${hw},${hw} 0 0,1 ${x1 + nx * hw},${y1 + ny * hw} Z`;
  }

  // Transmission angle color
  function transmColor(t: number): string {
    if (t >= 40) return 'var(--green)';
    if (t >= 20) return 'var(--orange)';
    return 'var(--red)';
  }

  // Grashof class label
  function grashofLabel(g: ReturnType<typeof grashofClass>): string {
    return g.grashofClass.toUpperCase().replace('-', '-');
  }

  // ── Drag interaction ──────────────────────────────────────────────────────
  function onSvgPointerDown(e: PointerEvent) {
    if (!paused || p.mechanism !== 'four-bar') return;
    dragging = true;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    setAngleFromMouse(e);
  }

  function onSvgPointerMove(e: PointerEvent) {
    if (!dragging) return;
    setAngleFromMouse(e);
  }

  function onSvgPointerUp() { dragging = false; }

  function setAngleFromMouse(e: PointerEvent) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const mx = e.clientX - rect.left - sx(0);
    const my = e.clientY - rect.top  - sy(0);
    const a  = Math.atan2(-my, mx) * 180 / Math.PI;
    angle    = ((a % 360) + 360) % 360;
  }
</script>

<div class="kinetic-view" bind:this={container}>
  <svg
    width={cw} height={ch} viewBox="0 0 {cw} {ch}"
    role="application"
    aria-label="Mechanism visualizer"
    onpointerdown={onSvgPointerDown}
    onpointermove={onSvgPointerMove}
    onpointerup={onSvgPointerUp}
    style={paused && p.mechanism === 'four-bar' ? 'cursor:crosshair' : ''}
  >

    {#if p.mechanism === 'four-bar'}
      <!-- ── FOUR-BAR LINKAGE ────────────────────────────────────────────── -->

      <!-- Coupler curve trace -->
      <path d={couplerTrace} fill="none" stroke="#4263EB" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>

      <!-- Ground line A to D -->
      <line x1={sx(0)} y1={sy(0)} x2={sx(p.fb_ground)} y2={sy(0)} stroke="var(--g300)" stroke-width="3"/>

      <!-- Ground symbols at A and D -->
      {#each [sx(0), sx(p.fb_ground)] as gx}
        <polygon
          points="{gx},{sy(0)} {gx - 10},{sy(0) + 14} {gx + 10},{sy(0) + 14}"
          fill="var(--g100)" stroke="var(--g400)" stroke-width="1.5" stroke-linejoin="round"
        />
        <line x1={gx - 13} y1={sy(0) + 14} x2={gx + 13} y2={sy(0) + 14} stroke="var(--g400)" stroke-width="1.5"/>
        {#each [0, 1, 2, 3, 4, 5] as i}
          <line
            x1={gx - 10 + i * 4} y1={sy(0) + 14}
            x2={gx - 14 + i * 4} y2={sy(0) + 20}
            stroke="var(--g400)" stroke-width="1"
          />
        {/each}
      {/each}

      {#if fbState && fbState.valid}
        <!-- Crank angle arc at A -->
        {@const arcR = pinR + 14}
        {@const θ2r = angle * Math.PI / 180}
        {@const arcEx = sx(0) + arcR * Math.cos(θ2r)}
        {@const arcEy = sy(0) - arcR * Math.sin(θ2r)}
        {@const largeArc = angle > 180 ? 1 : 0}
        <path
          d="M {sx(0) + arcR},{sy(0)} A {arcR},{arcR} 0 {largeArc},0 {arcEx},{arcEy}"
          fill="none" stroke="var(--orange)" stroke-width="1.5" opacity="0.6" stroke-dasharray="3,2"
        />

        <!-- Crank link AB -->
        <path
          d={capsulePath(sx(fbState.Ax), sy(fbState.Ay), sx(fbState.Bx), sy(fbState.By), linkW)}
          fill="#FFF0E0" stroke="var(--orange)" stroke-width="1.5"
        />
        <!-- Coupler link BC -->
        <path
          d={capsulePath(sx(fbState.Bx), sy(fbState.By), sx(fbState.Cx), sy(fbState.Cy), linkW)}
          fill="var(--g100)" stroke="var(--g600)" stroke-width="1.5"
        />
        <!-- Follower link CD -->
        <path
          d={capsulePath(sx(fbState.Cx), sy(fbState.Cy), sx(fbState.Dx), sy(fbState.Dy), linkW)}
          fill="#E6F7EC" stroke="var(--green)" stroke-width="1.5"
        />

        <!-- Pin hole visuals (white circles on joints) -->
        <circle cx={sx(fbState.Bx)} cy={sy(fbState.By)} r={Math.max(3, p.pinHoleD / 2 * mScale * 0.7)} fill="white" opacity="0.8"/>
        <circle cx={sx(fbState.Cx)} cy={sy(fbState.Cy)} r={Math.max(3, p.pinHoleD / 2 * mScale * 0.7)} fill="white" opacity="0.8"/>

        <!-- Coupler point extension line -->
        {#if p.fb_coupler_p !== 0 || p.fb_coupler_q !== 0}
          <!-- Extension from B toward P (since P is defined relative to B) -->
          <line
            x1={sx(fbState.Bx)} y1={sy(fbState.By)}
            x2={sx(fbState.Px)} y2={sy(fbState.Py)}
            stroke="#4263EB" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"
          />
        {/if}

        <!-- Coupler point P -->
        <circle cx={sx(fbState.Px)} cy={sy(fbState.Py)} r="7" fill="#4263EB" stroke="white" stroke-width="2"/>

        <!-- Joint markers B and C -->
        <circle cx={sx(fbState.Bx)} cy={sy(fbState.By)} r={pinR} fill="var(--orange)" stroke="white" stroke-width="1.5"/>
        <circle cx={sx(fbState.Cx)} cy={sy(fbState.Cy)} r={pinR} fill="var(--g600)"   stroke="white" stroke-width="1.5"/>

        <!-- Transmission angle indicator at C -->
        {@const cbAngle = Math.atan2(sy(fbState.By) - sy(fbState.Cy), sx(fbState.Bx) - sx(fbState.Cx))}
        {@const cdAngle = Math.atan2(sy(fbState.Dy) - sy(fbState.Cy), sx(fbState.Dx) - sx(fbState.Cx))}
        {@const taR = pinR + 10}
        {@const taEx = sx(fbState.Cx) + taR * Math.cos(cbAngle)}
        {@const taEy = sy(fbState.Cy) + taR * Math.sin(cbAngle)}
        {@const taStartX = sx(fbState.Cx) + taR * Math.cos(cdAngle)}
        {@const taStartY = sy(fbState.Cy) + taR * Math.sin(cdAngle)}
        <path
          d="M {taStartX},{taStartY} A {taR},{taR} 0 0,1 {taEx},{taEy}"
          fill="none" stroke={transmColor(fbState.transmAngle)} stroke-width="1.5" opacity="0.8"
        />

        <!-- Joint labels -->
        <text x={sx(fbState.Ax) - 14} y={sy(fbState.Ay) - pinR - 5} font-family="IBM Plex Mono,monospace" font-size="12" fill="var(--g500)">A</text>
        <text x={sx(fbState.Bx) + 8}  y={sy(fbState.By) - pinR - 5} font-family="IBM Plex Mono,monospace" font-size="12" fill="var(--orange)">B</text>
        <text x={sx(fbState.Cx) + 8}  y={sy(fbState.Cy) - pinR - 5} font-family="IBM Plex Mono,monospace" font-size="12" fill="var(--g600)">C</text>
        <text x={sx(fbState.Dx) + 8}  y={sy(fbState.Dy) - pinR - 5} font-family="IBM Plex Mono,monospace" font-size="12" fill="var(--g500)">D</text>
        <!-- P label -->
        <text x={sx(fbState.Px) + 10} y={sy(fbState.Py) - 5} font-family="IBM Plex Mono,monospace" font-size="11" fill="#4263EB">P</text>

      {:else}
        <!-- Invalid / locked state message -->
        <text x={cw / 2} y={ch / 2} text-anchor="middle"
          font-family="IBM Plex Mono, monospace" font-size="14"
          fill="var(--red)" letter-spacing="0.08em">LINKAGE LOCKED</text>
      {/if}

      <!-- Ground pivot circles at A and D (always on top of ground symbols) -->
      <circle cx={sx(0)}           cy={sy(0)} r={pinR} fill="var(--g200)" stroke="var(--g500)" stroke-width="2"/>
      <circle cx={sx(p.fb_ground)} cy={sy(0)} r={pinR} fill="var(--g200)" stroke="var(--g500)" stroke-width="2"/>

      <!-- Stats overlay (bottom-right) -->
      {#if fbState}
        {@const ta = fbState.transmAngle}
        <text x={cw - 16} y={ch - 76} text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="var(--g500)" letter-spacing="0.05em">θ₂ = {angle.toFixed(0)}°</text>
        <text x={cw - 16} y={ch - 58} text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="var(--g500)" letter-spacing="0.05em">θ₄ = {fbState.theta4.toFixed(0)}°</text>
        <text x={cw - 16} y={ch - 40} text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="var(--g500)" letter-spacing="0.05em">ω₄/ω₂ = {fbState.omega4.toFixed(2)}</text>
        <text x={cw - 16} y={ch - 22} text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill={transmColor(ta)} letter-spacing="0.05em">μ = {ta.toFixed(0)}°</text>
        <text x={cw - 16} y={ch - 6}  text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="11" fill="var(--g400)" letter-spacing="0.05em">μmin = {minTransmAngle.toFixed(0)}°</text>
      {/if}

      <!-- Grashof label (top-left) -->
      {#if grashof}
        <text x="16" y="24" font-family="IBM Plex Mono,monospace" font-size="12"
          fill={grashof.crankRotates ? 'var(--green)' : 'var(--orange)'}
          letter-spacing="0.08em">
          {grashofLabel(grashof)}
        </text>
      {/if}

      <!-- Play/Pause button (bottom-left) -->
      <rect
        x="12" y={ch - 42} width="90" height="26" rx="2"
        fill="var(--g100)" stroke="var(--g300)" stroke-width="1"
        style="cursor:pointer"
        onclick={() => paused = !paused}
        onkeydown={(e) => e.key === 'Enter' && (paused = !paused)}
        role="button"
        tabindex="0"
        aria-label={paused ? 'Play animation' : 'Pause animation'}
      />
      <text
        x="57" y={ch - 24} text-anchor="middle"
        font-family="IBM Plex Mono,monospace" font-size="11" fill="var(--g700)"
        letter-spacing="0.06em" style="cursor:pointer; pointer-events:none"
      >{paused ? '▶ PLAY' : '⏸ PAUSE'}</text>

      <!-- Drag hint when paused -->
      {#if paused}
        <text x="16" y={ch - 52} font-family="IBM Plex Mono,monospace" font-size="10" fill="var(--g400)" letter-spacing="0.06em">DRAG TO SET ANGLE</text>
      {/if}

    {:else}
      <!-- ── CRANK-SLIDER / SCOTCH-YOKE ──────────────────────────────────── -->
      {@const cs = p.mechanism === 'crank-slider'
        ? crankSliderState(angle, p.crankR, p.rodLength)
        : scotchYokeState(angle, p.crankR)}

      <!-- Slider guide line (crank-slider) -->
      {#if p.mechanism === 'crank-slider'}
        {@const st = cs as ReturnType<typeof crankSliderState>}
        <line
          x1={sx(-p.crankR - 10)} y1={sy(0)}
          x2={sx(p.crankR + p.rodLength + p.crankR + 10)} y2={sy(0)}
          stroke="var(--g200)" stroke-width="1" stroke-dasharray="6,4"
        />
        <line x1={sx(p.crankR)} y1={sy(-p.crankR * 0.25)} x2={sx(p.crankR + p.rodLength + p.crankR)} y2={sy(-p.crankR * 0.25)} stroke="var(--g200)" stroke-width="0.5"/>
        <line x1={sx(p.crankR)} y1={sy(p.crankR * 0.25)}  x2={sx(p.crankR + p.rodLength + p.crankR)} y2={sy(p.crankR * 0.25)}  stroke="var(--g200)" stroke-width="0.5"/>
        {@const blockW = p.crankR * 0.6 * mScale}
        {@const blockH = p.crankR * 0.5 * mScale}
        <rect x={sx(st.sliderX) - blockW / 2} y={sy(0) - blockH / 2} width={blockW} height={blockH}
          fill="var(--g100)" stroke="var(--g500)" stroke-width="1" rx="2"/>
        <line x1={sx(st.crankPinX)} y1={sy(st.crankPinY)} x2={sx(st.sliderX)} y2={sy(0)}
          stroke="var(--g600)" stroke-width={Math.max(2, p.pinHoleD * 0.6 * mScale)} stroke-linecap="round"/>
        <circle cx={sx(st.sliderX)} cy={sy(0)} r={pinR * 0.8} fill="var(--g400)"/>
      {/if}

      <!-- Scotch yoke -->
      {#if p.mechanism === 'scotch-yoke'}
        {@const st = cs as ReturnType<typeof scotchYokeState>}
        {@const yokeW = p.crankR * 0.5 * mScale}
        {@const yokeH = (p.crankR * 2 + 12) * mScale}
        <rect x={sx(st.yokeX) - yokeW / 2} y={sy(p.crankR + 6)} width={yokeW} height={yokeH}
          fill="var(--g100)" stroke="var(--g500)" stroke-width="1" rx="2"/>
        <rect x={sx(st.yokeX) - yokeW / 4} y={sy(p.crankR + 2)} width={yokeW / 2} height={(p.crankR * 2 + 4) * mScale}
          fill="var(--white)" stroke="var(--g300)" stroke-width="0.5"/>
        <circle cx={sx(st.crankPinX)} cy={sy(st.crankPinY)} r={pinR}
          fill="var(--orange)" stroke="var(--white)" stroke-width="1.5"/>
        <line x1={sx(-p.crankR * 2)} y1={sy(0)} x2={sx(p.crankR * 2)} y2={sy(0)}
          stroke="var(--g200)" stroke-width="0.5" stroke-dasharray="4,3"/>
      {/if}

      <!-- Crank disc -->
      {@const csTyped = cs as ReturnType<typeof crankSliderState> | ReturnType<typeof scotchYokeState>}
      <circle cx={sx(0)} cy={sy(0)} r={crankBodyR} fill="var(--g50)" stroke="var(--g400)" stroke-width="1"/>
      <line x1={sx(0)} y1={sy(0)} x2={sx(csTyped.crankPinX)} y2={sy(csTyped.crankPinY)}
        stroke="var(--g700)" stroke-width={Math.max(2.5, p.crankR * 0.15 * mScale)} stroke-linecap="round"/>
      <circle cx={sx(0)} cy={sy(0)} r={shaftR} fill="var(--g200)" stroke="var(--g500)" stroke-width="1"/>
      <circle cx={sx(csTyped.crankPinX)} cy={sy(csTyped.crankPinY)} r={pinR}
        fill="var(--orange)" stroke="var(--white)" stroke-width="1.5"/>

      <!-- Trace ghost -->
      <path d={tracePath} fill="none" stroke="var(--g200)" stroke-width="1" stroke-dasharray="3,3"/>

      <!-- Labels -->
      <text x={sx(0)} y={sy(0) + shaftR + 16}
        text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="8"
        style="fill: var(--g500)" letter-spacing="0.1em">r = {p.crankR} mm</text>

      {#if p.mechanism === 'crank-slider'}
        <text x={cw - 16} y={ch - 26} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9" style="fill: var(--g400)" letter-spacing="0.08em">STROKE  {(p.crankR * 2).toFixed(0)} mm</text>
        <text x={cw - 16} y={ch - 14} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9" style="fill: var(--g400)" letter-spacing="0.08em">ROD  {p.rodLength} mm</text>
      {:else}
        <text x={cw - 16} y={ch - 14} text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9" style="fill: var(--g400)" letter-spacing="0.08em">STROKE  {(p.crankR * 2).toFixed(0)} mm  (pure sine)</text>
      {/if}
    {/if}
  </svg>
</div>

<style>
  .kinetic-view { position: absolute; inset: 0; background: var(--white); }
</style>
