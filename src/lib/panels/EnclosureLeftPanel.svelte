<script lang="ts">
  import NumInput   from '$lib/components/NumInput.svelte';
  import { encFab } from '$stores/enclosures.svelte';
  import {
    CUTOUT_LABELS, CUTOUT_DIMS,
    type CutoutType, type PanelSide, type Cutout,
    type AnchorRef, type AnchorRefY,
  } from '$modules/enclosures/types';
  import { units } from '$stores/units.svelte';

  const p     = $derived(encFab.params);
  const panel = $derived(encFab.currentPanel);

  const panelCutouts = $derived(
    p.cutouts.filter(c => c.panel === p.editPanel || (p.editPanel === 'front' && !c.panel))
  );

  // ── Face picker cells ──────────────────────────────────────────────────────
  const FACE_CELLS: { side: PanelSide; label: string; x: number; y: number }[] = [
    { side: 'top',    label: 'TOP',    x: 51,  y: 0  },
    { side: 'left',   label: 'LEFT',   x: 0,   y: 24 },
    { side: 'front',  label: 'FRONT',  x: 51,  y: 24 },
    { side: 'right',  label: 'RIGHT',  x: 102, y: 24 },
    { side: 'back',   label: 'BACK',   x: 153, y: 24 },
    { side: 'bottom', label: 'BOTTOM', x: 51,  y: 48 },
  ];

  // ── Anchor helpers ─────────────────────────────────────────────────────────
  // Change refX or refY while keeping the cutout's current visual position.
  function setAnchorRef(c: Cutout, refX: AnchorRef | null, refY: AnchorRefY | null) {
    const nRefX: AnchorRef  = refX ?? c.anchor?.refX ?? 'left';
    const nRefY: AnchorRefY = refY ?? c.anchor?.refY ?? 'top';
    const w = panel.w, h = panel.h;
    const dx = nRefX === 'left' ? c.x : nRefX === 'right' ? w - c.x : c.x - w / 2;
    const dy = nRefY === 'top'  ? c.y : nRefY === 'bottom' ? h - c.y : c.y - h / 2;
    encFab.updateCutout(c.id, { anchor: { refX: nRefX, refY: nRefY, dx, dy } });
  }

  // CTR button handlers — center the cutout AND lock anchor to center so it stays
  // centered when the enclosure is resized.
  function doCtrX(c: Cutout) {
    encFab.updateCutout(c.id, {
      x: panel.w / 2,
      anchor: { refX: 'center', dx: 0, refY: c.anchor?.refY ?? 'top', dy: c.anchor?.dy ?? c.y },
    });
  }
  function doCtrY(c: Cutout) {
    encFab.updateCutout(c.id, {
      y: panel.h / 2,
      anchor: { refX: c.anchor?.refX ?? 'left', dx: c.anchor?.dx ?? c.x, refY: 'center', dy: 0 },
    });
  }
  function doCtrXY(c: Cutout) {
    encFab.updateCutout(c.id, {
      x: panel.w / 2, y: panel.h / 2,
      anchor: { refX: 'center', dx: 0, refY: 'center', dy: 0 },
    });
  }

  function anchorLabel(c: Cutout): string {
    if (!c.anchor) return '';
    const a = c.anchor;
    const xStr = a.refX === 'center' ? 'CTR' : a.refX === 'left' ? `${a.dx.toFixed(1)}←L` : `${a.dx.toFixed(1)}→R`;
    const yStr = a.refY === 'center' ? 'CTR' : a.refY === 'top'  ? `${a.dy.toFixed(1)}↓T` : `${a.dy.toFixed(1)}↑B`;
    return `${xStr}  ×  ${yStr}`;
  }

  // ── PCB mount helper ───────────────────────────────────────────────────────
  let pcbBolt      = $state<CutoutType>('m3');
  let pcbSpacingW  = $state(45);
  let pcbSpacingH  = $state(50);

  function addPCBMount() {
    const cx   = panel.w / 2;
    const cy   = panel.h / 2;
    const hw   = pcbSpacingW / 2;
    const hh   = pcbSpacingH / 2;
    const side = p.editPanel;
    encFab.addCutouts([
      { type: pcbBolt, x: cx - hw, y: cy - hh, label: 'M-TL', panel: side },
      { type: pcbBolt, x: cx + hw, y: cy - hh, label: 'M-TR', panel: side },
      { type: pcbBolt, x: cx - hw, y: cy + hh, label: 'M-BL', panel: side },
      { type: pcbBolt, x: cx + hw, y: cy + hh, label: 'M-BR', panel: side },
    ]);
  }

  // ── Enclosure presets ──────────────────────────────────────────────────────
  type PresetCutout = Omit<Cutout, 'id'> & { panel: PanelSide };

  interface EnclosurePreset {
    label: string;
    desc:  string;
    enc:   { width: number; height: number; depth: number; thickness?: number };
    cutouts: PresetCutout[];
  }

  const PRESETS: EnclosurePreset[] = [
    {
      label: 'RPi 4',
      desc: 'Raspberry Pi 4 — IO back, USB+LAN right, GPIO top',
      // Board 85×56mm: long axis (85mm) along width. Long edge has USB-C/HDMI/audio → back.
      // Short edge (56mm) has USB×4 + Ethernet → right panel. GPIO on other long edge → top.
      enc:  { width: 95, height: 35, depth: 65, thickness: 3 },
      cutouts: [
        // BACK panel (95×35mm) — long edge (85mm): USB-C, HDMI×2, audio; 5mm board margins
        { type: 'usbc',       x: 20,  y: 18, label: 'PWR',    panel: 'back' },
        { type: 'hdmi_micro', x: 34,  y: 18, label: 'HDMI 0', panel: 'back' },
        { type: 'hdmi_micro', x: 49,  y: 18, label: 'HDMI 1', panel: 'back' },
        { type: 'jack635',    x: 65,  y: 18, label: 'AUDIO',  panel: 'back' },
        // RIGHT panel (65×35mm) — short edge (56mm): USB3, USB2, Ethernet; 4.5mm margins
        { type: 'rect',  x: 15,  y: 18, label: 'USB 3',  panel: 'right', w: 14, h: 17 },
        { type: 'rect',  x: 32,  y: 18, label: 'USB 2',  panel: 'right', w: 14, h: 17 },
        { type: 'rect',  x: 50,  y: 18, label: 'LAN',    panel: 'right', w: 17, h: 14 },
        // TOP panel (95×65mm) — GPIO 2×20 header slot near front long edge of board
        { type: 'rect',  x: 34,  y:  8, label: 'GPIO',   panel: 'top',   w: 52, h:  6 },
      ],
    },
    {
      label: 'ARDUINO',
      desc: 'Arduino Uno — USB-B + DC jack back, pin header slots top',
      // Board 68.6×53.4mm: long axis along depth (78mm), short axis along width (64mm).
      // USB-B + DC jack are on the 53.4mm short edge → face back panel (64mm wide).
      // Pin header rows run along the 68.6mm long edges → slots in top panel (64×78mm).
      enc:  { width: 64, height: 30, depth: 78, thickness: 3 },
      cutouts: [
        // BACK panel (64×30mm) — USB-B + DC jack (board short edge 53.4mm, 5.3mm margins)
        { type: 'circle', x: 11,  y: 15, label: 'DC 9V', panel: 'back', d: 6.4       },
        { type: 'rect',   x: 49,  y: 15, label: 'USB-B', panel: 'back', w: 13, h: 13 },
        // TOP panel (64×78mm) — two pin header rows near each long edge of the board
        { type: 'rect',   x:  8,  y: 40, label: 'PINS',  panel: 'top',  w:  6, h: 50 },
        { type: 'rect',   x: 56,  y: 40, label: 'PINS',  panel: 'top',  w:  6, h: 50 },
      ],
    },
    {
      label: 'GUITAR PEDAL',
      desc: 'Effects pedal — 1590B layout with jacks, switch, pots',
      enc:  { width: 113, height: 32, depth: 88, thickness: 3 },
      cutouts: [
        { type: 'jack635',  x: 20,  y: 16, label: 'INPUT',  panel: 'front' },
        { type: 'jack635',  x: 93,  y: 16, label: 'OUTPUT', panel: 'front' },
        { type: 'circle',   x: 20,  y: 16, label: 'DC 9V',  panel: 'back', d: 5.5 },
        { type: 'pot6',     x: 28,  y: 22, label: 'DRIVE',  panel: 'top'   },
        { type: 'pot6',     x: 57,  y: 22, label: 'TONE',   panel: 'top'   },
        { type: 'pot6',     x: 85,  y: 22, label: 'LEVEL',  panel: 'top'   },
        { type: 'switch12', x: 57,  y: 62, label: 'BYPASS', panel: 'top'   },
      ],
    },
    {
      label: 'SYNTH MODULE',
      desc: 'Eurorack-style synth module panel — jacks + pots',
      enc:  { width: 34, height: 128, depth: 40, thickness: 2 },
      cutouts: [
        { type: 'pot6',     x: 17, y: 28,  label: 'RATE',  panel: 'front' },
        { type: 'pot6',     x: 17, y: 58,  label: 'DEPTH', panel: 'front' },
        { type: 'jack635',  x: 17, y: 94,  label: 'IN',    panel: 'front' },
        { type: 'jack635',  x: 17, y: 114, label: 'OUT',   panel: 'front' },
      ],
    },
    {
      label: 'AUDIO INTERFACE',
      desc: 'Recording interface front panel — XLR, headphone, pots',
      enc:  { width: 200, height: 44, depth: 100, thickness: 3 },
      cutouts: [
        { type: 'xlr',      x: 30,  y: 22, label: 'XLR L',  panel: 'front' },
        { type: 'xlr',      x: 72,  y: 22, label: 'XLR R',  panel: 'front' },
        { type: 'jack635',  x: 112, y: 22, label: 'PHONES',  panel: 'front' },
        { type: 'pot6',     x: 142, y: 22, label: 'GAIN',    panel: 'front' },
        { type: 'pot6',     x: 167, y: 22, label: 'LEVEL',   panel: 'front' },
        { type: 'switch12', x: 190, y: 22, label: 'PWR',     panel: 'front' },
        { type: 'xlr',      x: 30,  y: 22, label: 'OUT L',   panel: 'back'  },
        { type: 'xlr',      x: 72,  y: 22, label: 'OUT R',   panel: 'back'  },
        { type: 'usbc',     x: 112, y: 22, label: 'USB-C',   panel: 'back'  },
      ],
    },
    {
      label: 'DB-9 BOX',
      desc: 'RS-232 / serial breakout — DE-9 connector',
      enc:  { width: 62, height: 36, depth: 44, thickness: 3 },
      cutouts: [
        { type: 'dsub9',  x: 31, y: 18, label: 'DE-9',  panel: 'front' },
        { type: 'dsub9',  x: 31, y: 18, label: 'DE-9',  panel: 'back'  },
      ],
    },
    {
      label: 'MEDIA BOX',
      desc: 'HDMI / USB media centre front panel',
      enc:  { width: 150, height: 50, depth: 80, thickness: 3 },
      cutouts: [
        { type: 'switch12', x: 16,  y: 25, label: 'PWR',   panel: 'front' },
        { type: 'usbc',     x: 45,  y: 25, label: 'USB-C', panel: 'front' },
        { type: 'hdmi_a',   x: 80,  y: 25, label: 'HDMI',  panel: 'front' },
        { type: 'jack635',  x: 115, y: 25, label: 'AUDIO', panel: 'front' },
        { type: 'hdmi_a',   x: 40,  y: 25, label: 'HDMI',  panel: 'back'  },
        { type: 'usbc',     x: 75,  y: 25, label: 'PWR',   panel: 'back'  },
      ],
    },
  ];

  function applyPreset(preset: EnclosurePreset) {
    const base = Date.now();
    const cutouts: Cutout[] = preset.cutouts.map((c, i) => ({ id: `p${base}_${i}`, ...c }));
    encFab.update({
      width:     preset.enc.width,
      height:    preset.enc.height,
      depth:     preset.enc.depth,
      thickness: preset.enc.thickness ?? 3,
      editPanel: 'front',
      cutouts,
    });
  }

  // ADD CUTOUT accordion state — only one group expanded at a time
  let openGroup = $state<string>('connectors');
  function toggleGroup(id: string) {
    openGroup = openGroup === id ? '' : id;
  }

  // Kerf-compensated actual cut dimension for display
  function actualDim(type: CutoutType): string {
    const dims = CUTOUT_DIMS[type];
    if (dims.shape === 'circle') {
      const d = dims.w - p.kerf;
      return `Ø${d.toFixed(1)}`;
    }
    const w = (dims.w - p.kerf).toFixed(1);
    const h = (dims.h - p.kerf).toFixed(1);
    return `${w}×${h}`;
  }
</script>

<div class="panel-left">

  <!-- ENCLOSURE DIMENSIONS -->
  <section class="panel-section">
    <div class="section-label">ENCLOSURE</div>
    <NumInput label="WIDTH"     value={units.toDisplay(p.width)}     min={units.toDisplay(20)}  max={units.toDisplay(2000)} step={units.dimStep()}    unit={units.label} onchange={v => encFab.update({ width: units.fromDisplay(v) })} />
    <NumInput label="HEIGHT"    value={units.toDisplay(p.height)}    min={units.toDisplay(10)}  max={units.toDisplay(500)}  step={units.dimStep()}    unit={units.label} onchange={v => encFab.update({ height: units.fromDisplay(v) })} />
    <NumInput label="DEPTH"     value={units.toDisplay(p.depth)}     min={units.toDisplay(20)}  max={units.toDisplay(1000)} step={units.dimStep()}    unit={units.label} onchange={v => encFab.update({ depth: units.fromDisplay(v) })} />
    <NumInput label="THICKNESS" value={units.toDisplay(p.thickness)} min={units.toDisplay(0.5)} max={units.toDisplay(25)}   step={units.thickStep()} unit={units.label} onchange={v => encFab.update({ thickness: units.fromDisplay(v) })} />
    <NumInput label="LASER KERF" value={p.kerf} min={0} max={1} step={0.01} unit="mm" onchange={v => encFab.update({ kerf: v })} />
    <div class="hint-text">Kerf compensates cut edges. Holes drawn {p.kerf > 0 ? `${(p.kerf/2).toFixed(2)} mm` : '—'} inward.</div>
  </section>

  <!-- PRESETS -->
  <section class="panel-section">
    <div class="section-label">PRESETS</div>
    <div class="preset-grid">
      {#each PRESETS as preset}
        <button class="preset-btn" onclick={() => applyPreset(preset)} title={preset.desc}>
          {preset.label}
        </button>
      {/each}
    </div>
    <div class="hint-text" style="margin-top:6px">Applies enclosure dimensions + pre-placed port cutouts.</div>
  </section>

  <!-- FINGER JOINTS -->
  <section class="panel-section">
    <div class="section-label">FINGER JOINTS</div>
    <div class="toggle-row">
      <label class="toggle-label">
        <input type="checkbox" checked={p.fingerJoints}
          onchange={e => encFab.update({ fingerJoints: (e.target as HTMLInputElement).checked })}
        />
        ENABLE FINGER JOINTS
      </label>
    </div>
    {#if p.fingerJoints}
      <div style="margin-top:8px">
        <NumInput label="FINGER COUNT" value={p.fingerCount} min={2} max={20} step={1} unit=""
          onchange={v => encFab.update({ fingerCount: v })} />
      </div>
      <div class="hint-text" style="margin-top:6px">Panel outlines update in the view and SVG export.</div>
    {/if}
  </section>

  <!-- EDIT PANEL — isometric face picker -->
  <section class="panel-section">
    <div class="section-label">EDIT PANEL</div>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <svg viewBox="0 0 204 72" class="face-picker-svg" role="group">
      {#each FACE_CELLS as fc}
        {@const active = p.editPanel === fc.side}
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <g role="button" onclick={() => encFab.update({ editPanel: fc.side })} style="cursor:pointer">
          <rect x={fc.x + 1} y={fc.y + 1} width={49} height={22}
            fill={active ? 'var(--orange)' : 'var(--g100)'}
            stroke={active ? 'var(--orange)' : 'var(--g300)'}
            stroke-width="0.8" rx="1.5"/>
          <text x={fc.x + 25.5} y={fc.y + 14.5}
            text-anchor="middle"
            font-family="IBM Plex Mono, monospace"
            font-size="7.5"
            font-weight={active ? '700' : '500'}
            fill={active ? 'white' : 'var(--g600)'}
            letter-spacing="0.06em">{fc.label}</text>
        </g>
      {/each}
    </svg>
    <div class="stat-row" style="margin-top:8px">
      <span class="stat-key">PANEL SIZE</span>
      <span class="stat-val">{panel?.w.toFixed(1)} × {panel?.h.toFixed(1)}<span class="unit"> mm</span></span>
    </div>
  </section>

  <!-- ADD CUTOUT -->
  <section class="panel-section">
    <div class="section-label">ADD CUTOUT  →  {p.editPanel.toUpperCase()}</div>

    <!-- CONNECTORS -->
    <button class="acc-header" onclick={() => toggleGroup('connectors')}>
      <span>CONNECTORS</span><span class="acc-arrow">{openGroup === 'connectors' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'connectors'}
      <div class="acc-body">
        <div class="cutout-grid">
          {#each (['usbc','hdmi_a','hdmi_mini','hdmi_micro'] as CutoutType[]) as type}
            <button class="cutout-btn" onclick={() => encFab.addCutout(type)} title={actualDim(type) + ' mm'}>
              <span class="btn-label">{CUTOUT_LABELS[type]}</span>
              <span class="btn-dim">{actualDim(type)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- D-SUB -->
    <button class="acc-header" onclick={() => toggleGroup('dsub')}>
      <span>D-SUB</span><span class="acc-arrow">{openGroup === 'dsub' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'dsub'}
      <div class="acc-body">
        <div class="cutout-grid">
          {#each (['dsub9','dsub15','dsub25'] as CutoutType[]) as type}
            <button class="cutout-btn" onclick={() => encFab.addCutout(type)} title={actualDim(type) + ' mm'}>
              <span class="btn-label">{CUTOUT_LABELS[type]}</span>
              <span class="btn-dim">{actualDim(type)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- AUDIO / CONTROLS -->
    <button class="acc-header" onclick={() => toggleGroup('audio')}>
      <span>AUDIO / CONTROLS</span><span class="acc-arrow">{openGroup === 'audio' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'audio'}
      <div class="acc-body">
        <div class="cutout-grid">
          {#each (['xlr','jack635','pot6','switch12'] as CutoutType[]) as type}
            <button class="cutout-btn" onclick={() => encFab.addCutout(type)} title={actualDim(type) + ' mm'}>
              <span class="btn-label">{CUTOUT_LABELS[type]}</span>
              <span class="btn-dim">{actualDim(type)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- SCREWS -->
    <button class="acc-header" onclick={() => toggleGroup('screws')}>
      <span>SCREWS  (ISO CLEARANCE)</span><span class="acc-arrow">{openGroup === 'screws' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'screws'}
      <div class="acc-body">
        <div class="cutout-grid">
          {#each (['m2','m2_5','m3','m4','m5'] as CutoutType[]) as type}
            <button class="cutout-btn" onclick={() => encFab.addCutout(type)} title={actualDim(type) + ' mm'}>
              <span class="btn-label">{CUTOUT_LABELS[type]}</span>
              <span class="btn-dim">{actualDim(type)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- PCB MOUNT -->
    <button class="acc-header" onclick={() => toggleGroup('pcb')}>
      <span>PCB MOUNT  (4-CORNER)</span><span class="acc-arrow">{openGroup === 'pcb' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'pcb'}
      <div class="acc-body">
        <div class="pcb-row">
          {#each (['m2_5','m3','m4'] as CutoutType[]) as bt}
            <button class="pcb-bolt-btn {pcbBolt === bt ? 'active' : ''}" onclick={() => pcbBolt = bt}>
              {CUTOUT_LABELS[bt]}
            </button>
          {/each}
        </div>
        <div class="pcb-row" style="margin-top:5px; align-items:center; gap:5px">
          <span class="mini-label" style="min-width:14px">W</span>
          <input type="number" class="mini-field" value={pcbSpacingW} min="5" max="300" step="1"
            onchange={e => pcbSpacingW = parseFloat((e.target as HTMLInputElement).value)} />
          <span class="mini-label">×</span>
          <input type="number" class="mini-field" value={pcbSpacingH} min="5" max="300" step="1"
            onchange={e => pcbSpacingH = parseFloat((e.target as HTMLInputElement).value)} />
          <button class="pcb-add-btn" onclick={addPCBMount}>ADD</button>
        </div>
        <div class="hint-text" style="margin-top:4px">Places 4 holes at ±W/2, ±H/2 from panel centre.</div>
      </div>
    {/if}

    <!-- CUSTOM -->
    <button class="acc-header" onclick={() => toggleGroup('custom')}>
      <span>CUSTOM</span><span class="acc-arrow">{openGroup === 'custom' ? '▲' : '▼'}</span>
    </button>
    {#if openGroup === 'custom'}
      <div class="acc-body">
        <div class="cutout-grid">
          {#each (['circle','rect'] as CutoutType[]) as type}
            <button class="cutout-btn" onclick={() => encFab.addCutout(type)} title={actualDim(type) + ' mm'}>
              <span class="btn-label">{CUTOUT_LABELS[type]}</span>
              <span class="btn-dim">{actualDim(type)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- CUTOUTS LIST -->
  <section class="panel-section">
    <div class="section-label">CUTOUTS ON {p.editPanel.toUpperCase()}  ({panelCutouts.length})</div>
    {#each panelCutouts as c (c.id)}
      <div class="cutout-item">
        <div class="cutout-item-header">
          <span class="cutout-item-type">{CUTOUT_LABELS[c.type]}</span>
          <span class="cutout-item-dims">{actualDim(c.type)}</span>
          <button class="cutout-remove" onclick={() => encFab.removeCutout(c.id)}>✕</button>
        </div>

        <!-- X / Y position -->
        <div class="cutout-item-inputs">
          <div class="mini-input">
            <span class="mini-label">X</span>
            <input type="number" class="mini-field" value={c.x} step="0.5"
              onchange={e => encFab.updateCutout(c.id, { x: parseFloat((e.target as HTMLInputElement).value) })}
            />
          </div>
          <div class="mini-input">
            <span class="mini-label">Y</span>
            <input type="number" class="mini-field" value={c.y} step="0.5"
              onchange={e => encFab.updateCutout(c.id, { y: parseFloat((e.target as HTMLInputElement).value) })}
            />
          </div>
        </div>

        <!-- Centre-snap + anchor -->
        <div class="ctr-row">
          <button class="ctr-btn" onclick={() => doCtrX(c)}>CTR X</button>
          <button class="ctr-btn" onclick={() => doCtrY(c)}>CTR Y</button>
          <button class="ctr-btn ctr-both" onclick={() => doCtrXY(c)}>CTR XY</button>
        </div>

        <!-- Anchor reference selector -->
        <div class="anchor-row">
          <span class="anchor-axis-lbl">X</span>
          {#each (['left','center','right'] as AnchorRef[]) as ref}
            <button
              class="anchor-btn {c.anchor?.refX === ref ? 'active' : ''}"
              onclick={() => setAnchorRef(c, ref, null)}
              title="Anchor X to {ref}"
            >{ref === 'left' ? 'L' : ref === 'center' ? 'C' : 'R'}</button>
          {/each}
          <span class="anchor-axis-lbl" style="margin-left:5px">Y</span>
          {#each (['top','center','bottom'] as AnchorRefY[]) as ref}
            <button
              class="anchor-btn {c.anchor?.refY === ref ? 'active' : ''}"
              onclick={() => setAnchorRef(c, null, ref)}
              title="Anchor Y to {ref}"
            >{ref === 'top' ? 'T' : ref === 'center' ? 'C' : 'B'}</button>
          {/each}
          {#if c.anchor}
            <button class="anchor-clear" onclick={() => encFab.updateCutout(c.id, { anchor: undefined })} title="Remove anchor">×</button>
          {/if}
        </div>
        {#if c.anchor}
          <div class="anchor-status">{anchorLabel(c)}</div>
        {:else}
          <div class="anchor-status muted">NO ANCHOR  ·  CTR sets anchor automatically</div>
        {/if}

        <!-- Type-specific overrides -->
        {#if c.type === 'circle'}
          <div class="cutout-item-inputs">
            <div class="mini-input" style="flex:1">
              <span class="mini-label">Ø</span>
              <input type="number" class="mini-field" value={c.d ?? CUTOUT_DIMS[c.type].w} step="0.5" min="1" max="200"
                onchange={e => encFab.updateCutout(c.id, { d: parseFloat((e.target as HTMLInputElement).value) })}
              />
              <span class="mini-unit">mm</span>
            </div>
            <div class="mini-input" style="flex:1">
              <span class="mini-label">ROT</span>
              <input type="number" class="mini-field" value={c.rotation ?? 0} step="90" min="0" max="359"
                onchange={e => encFab.updateCutout(c.id, { rotation: parseFloat((e.target as HTMLInputElement).value) % 360 })}
              />
              <span class="mini-unit">°</span>
            </div>
          </div>
        {:else if c.type === 'rect'}
          <div class="cutout-item-inputs">
            <div class="mini-input">
              <span class="mini-label">W</span>
              <input type="number" class="mini-field" value={c.w ?? CUTOUT_DIMS[c.type].w} step="0.5" min="1"
                onchange={e => encFab.updateCutout(c.id, { w: parseFloat((e.target as HTMLInputElement).value) })}
              />
            </div>
            <div class="mini-input">
              <span class="mini-label">H</span>
              <input type="number" class="mini-field" value={c.h ?? CUTOUT_DIMS[c.type].h} step="0.5" min="1"
                onchange={e => encFab.updateCutout(c.id, { h: parseFloat((e.target as HTMLInputElement).value) })}
              />
            </div>
          </div>
          <div class="cutout-item-inputs">
            <div class="mini-input" style="flex:1">
              <span class="mini-label">ROT</span>
              <input type="number" class="mini-field" value={c.rotation ?? 0} step="90" min="0" max="359"
                onchange={e => encFab.updateCutout(c.id, { rotation: parseFloat((e.target as HTMLInputElement).value) % 360 })}
              />
              <span class="mini-unit">°</span>
            </div>
          </div>
        {:else}
          <div class="cutout-item-inputs">
            <div class="mini-input" style="flex:1">
              <span class="mini-label">ROT</span>
              <input type="number" class="mini-field" value={c.rotation ?? 0} step="90" min="0" max="359"
                onchange={e => encFab.updateCutout(c.id, { rotation: parseFloat((e.target as HTMLInputElement).value) % 360 })}
              />
              <span class="mini-unit">°</span>
            </div>
          </div>
        {/if}

        <input type="text" class="label-field" value={c.label} placeholder="LABEL"
          oninput={e => encFab.updateCutout(c.id, { label: (e.target as HTMLInputElement).value })}
        />
        <div class="hint-text" style="margin-top:4px">
          From top-left  ·  drag in view to reposition
        </div>
      </div>
    {/each}
    {#if panelCutouts.length === 0}
      <div class="hint-text">No cutouts on this panel.<br>Use ADD CUTOUT above.</div>
    {/if}
  </section>

</div>

<style>
  /* ── Face picker ── */
  .face-picker-svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }

  /* ── Preset grid ── */
  .preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .preset-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--g700);
    background: var(--g50);
    border: 1px solid var(--g200);
    padding: 8px 4px;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .preset-btn:hover { background: var(--orange); border-color: var(--orange); color: var(--white); }

  /* ── Toggle ── */
  .toggle-row { display: flex; align-items: center; }
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

  /* ── Accordion ── */
  .acc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 7px 0;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--g600);
    background: none;
    border: none;
    border-bottom: 1px solid var(--g100);
    cursor: pointer;
    text-align: left;
    transition: color 0.1s;
    margin-top: 4px;
  }
  .acc-header:hover { color: var(--black); }
  .acc-arrow { font-size: 8px; color: var(--g400); }
  .acc-body { padding: 8px 0 4px; }

  /* ── Cutout buttons ── */
  .cutout-group-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--g600);
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .cutout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  .cutout-btn {
    font-family: var(--font-mono);
    color: var(--g700);
    background: var(--g50);
    border: 1px solid var(--g200);
    padding: 7px 4px 6px;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, border-color 0.12s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .cutout-btn:hover { background: var(--g200); border-color: var(--g400); }
  .btn-label { font-size: 10px; letter-spacing: 0.07em; font-weight: 500; }
  .btn-dim   { font-size: 10px; color: var(--g500); letter-spacing: 0.04em; }

  /* ── PCB mount helper ── */
  .pcb-row {
    display: flex;
    gap: 4px;
  }
  .pcb-bolt-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--g600);
    background: var(--g50);
    border: 1px solid var(--g200);
    padding: 5px 6px;
    cursor: pointer;
    flex: 1;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .pcb-bolt-btn.active { background: var(--black); border-color: var(--black); color: var(--white); }
  .pcb-bolt-btn:hover:not(.active) { background: var(--g200); }
  .pcb-add-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--white);
    background: var(--orange);
    border: 1px solid var(--orange);
    padding: 5px 10px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.12s;
  }
  .pcb-add-btn:hover { opacity: 0.85; }

  /* ── Cutout list items ── */
  .cutout-item {
    background: var(--g50);
    border: 1px solid var(--g200);
    padding: 10px;
    margin-bottom: 8px;
  }
  .cutout-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .cutout-item-type {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--g700);
    font-weight: 600;
    flex: 1;
  }
  .cutout-item-dims {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    letter-spacing: 0.04em;
  }
  .cutout-remove {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--g400);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 3px;
    flex-shrink: 0;
  }
  .cutout-remove:hover { color: var(--red); }
  .cutout-item-inputs {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
  }
  .mini-input {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
  }
  .mini-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--g500);
    letter-spacing: 0.06em;
    min-width: 12px;
  }
  .mini-unit {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g400);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .mini-field, .label-field {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--black);
    background: var(--white);
    border: 1px solid var(--g200);
    padding: 5px 7px;
    width: 100%;
    outline: none;
  }
  .mini-field:focus, .label-field:focus { border-color: var(--orange); }
  .label-field { width: 100%; box-sizing: border-box; }

  /* ── Anchor controls ── */
  .anchor-row {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-bottom: 4px;
  }
  .anchor-axis-lbl {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    letter-spacing: 0.06em;
    min-width: 10px;
    text-align: center;
  }
  .anchor-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    width: 22px;
    height: 22px;
    border: 1px solid var(--g200);
    background: var(--g50);
    color: var(--g500);
    cursor: pointer;
    padding: 0;
    text-align: center;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .anchor-btn:hover:not(.active) { background: var(--g200); color: var(--g700); }
  .anchor-btn.active { background: var(--black); border-color: var(--black); color: var(--white); }
  .anchor-clear {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--g400);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 3px;
    margin-left: 3px;
    line-height: 1;
  }
  .anchor-clear:hover { color: var(--red); }
  .anchor-status {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--orange);
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }
  .anchor-status.muted { color: var(--g400); }

  /* ── Centre-snap buttons ── */
  .ctr-row {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .ctr-btn {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    color: var(--g600);
    background: var(--g100);
    border: 1px solid var(--g300);
    padding: 4px 0;
    flex: 1;
    cursor: pointer;
    text-align: center;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .ctr-btn:hover { background: var(--orange); color: var(--white); border-color: var(--orange); }
  .ctr-both { flex: 1.4; }

  .hint-text {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--g500);
    line-height: 1.7;
    letter-spacing: 0.03em;
  }
</style>
