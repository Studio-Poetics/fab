<script lang="ts">
  import LeftPanel       from '$lib/panels/LeftPanel.svelte';
  import RightPanel      from '$lib/panels/RightPanel.svelte';
  import FabricationView from '$lib/workspace/FabricationView.svelte';
  import GearView        from '$lib/workspace/GearView.svelte';
  import PlanetaryView   from '$lib/workspace/PlanetaryView.svelte';
  import RackPinionView  from '$lib/workspace/RackPinionView.svelte';
  import GearLeftPanel   from '$lib/panels/GearLeftPanel.svelte';
  import GearRightPanel  from '$lib/panels/GearRightPanel.svelte';
  import { gearFab }     from '$stores/gears.svelte';
  import HingeView       from '$lib/workspace/HingeView.svelte';
  import HingeLeftPanel  from '$lib/panels/HingeLeftPanel.svelte';
  import HingeRightPanel from '$lib/panels/HingeRightPanel.svelte';
  import KineticView     from '$lib/workspace/KineticView.svelte';
  import KineticLeftPanel  from '$lib/panels/KineticLeftPanel.svelte';
  import KineticRightPanel from '$lib/panels/KineticRightPanel.svelte';
  import EnclosureView     from '$lib/workspace/EnclosureView.svelte';
  import EnclosureLeftPanel  from '$lib/panels/EnclosureLeftPanel.svelte';
  import EnclosureRightPanel from '$lib/panels/EnclosureRightPanel.svelte';
  import CreditsView     from '$lib/components/CreditsView.svelte';
  import GuideView       from '$lib/components/GuideView.svelte';
  import { fab } from '$stores/fabrication.svelte';
  import { kineticFab } from '$stores/kinetic.svelte';
  import { encFab } from '$stores/enclosures.svelte';
  import { hingeFab } from '$stores/hinges.svelte';
  import { units } from '$stores/units.svelte';
  import { encodeState, decodeState } from '$core/urlState';
  import { onMount } from 'svelte';

  // Lazy-load Three.js only when needed
  let AssemblyView: typeof import('$lib/workspace/AssemblyView.svelte').default | null = $state(null);
  $effect(() => {
    if (activeModule === 'box' && view === 'assembled' && !AssemblyView) {
      import('$lib/workspace/AssemblyView.svelte').then(m => { AssemblyView = m.default; });
    }
  });

  let GearThreeView: typeof import('$lib/workspace/GearThreeView.svelte').default | null = $state(null);
  $effect(() => {
    if (activeModule === 'gears' && gearView === '3d' && !GearThreeView) {
      import('$lib/workspace/GearThreeView.svelte').then(m => { GearThreeView = m.default; });
    }
  });

  let EnclosureThreeView: typeof import('$lib/workspace/EnclosureThreeView.svelte').default | null = $state(null);
  $effect(() => {
    if (activeModule === 'enclosures' && encView === '3d' && !EnclosureThreeView) {
      import('$lib/workspace/EnclosureThreeView.svelte').then(m => { EnclosureThreeView = m.default; });
    }
  });

  type ViewMode     = 'flat' | 'assembled' | 'simulation';
  type GearViewMode = '2d' | 'blueprint' | '3d';
  type EncViewMode  = '2d' | '3d';
  let view        = $state<ViewMode>('flat');
  let gearView    = $state<GearViewMode>('2d');
  let encView     = $state<EncViewMode>('2d');
  const gearMode  = $derived(gearFab.params.gearMode);
  let showCredits = $state(false);
  let showGuide   = $state(false);

  const statusClass = $derived(
    fab.warnings.some(w => w.level === 'error') ? 'error' :
    fab.warnings.length > 0 ? 'warning' : 'ready'
  );

  const statusText = $derived(
    fab.warnings.some(w => w.level === 'error') ? 'ERROR' :
    fab.warnings.length > 0 ? `${fab.warnings.length} WARNING${fab.warnings.length > 1 ? 'S' : ''}` :
    'READY'
  );

  const modules = [
    { id: 'box',      label: 'BOX',     locked: false },
    { id: 'gears',    label: 'GEARS',   locked: false },
    { id: 'hinges',   label: 'HINGES',  locked: false },
    { id: 'kinetic',  label: 'KINETIC', locked: false },
    { id: 'enclosures', label: 'ENCLOSURES', locked: false },
  ];

  let activeModule = $state('box');

  // ── Undo / Redo keyboard handler ─────────────────────────────────────
  onMount(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (activeModule === 'box')        fab.undo();
        if (activeModule === 'gears')      gearFab.undo();
        if (activeModule === 'kinetic')    kineticFab.undo();
        if (activeModule === 'enclosures') encFab.undo();
        if (activeModule === 'hinges')     hingeFab.undo();
      }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (activeModule === 'box')        fab.redo();
        if (activeModule === 'gears')      gearFab.redo();
        if (activeModule === 'kinetic')    kineticFab.redo();
        if (activeModule === 'enclosures') encFab.redo();
        if (activeModule === 'hinges')     hingeFab.redo();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // ── URL state persistence ─────────────────────────────────────────────
  onMount(() => {
    const saved = decodeState(location.hash);
    if (saved) {
      if (saved.module) activeModule = saved.module;
      if (saved.view)   view = saved.view as typeof view;
      Object.assign(fab.params, saved.box);
      Object.assign(gearFab.params, saved.gears);
      Object.assign(kineticFab.params, saved.kinetic);
      if (saved.enclosures) Object.assign(encFab.params, saved.enclosures);
      if (saved.hinges)     Object.assign(hingeFab.params, saved.hinges);
    }
  });

  $effect(() => {
    const hash = encodeState({
      module: activeModule, view,
      box:        { ...fab.params },
      gears:      { ...gearFab.params },
      kinetic:    { ...kineticFab.params },
      enclosures: { ...encFab.params, cutouts: encFab.params.cutouts.map(c => ({ ...c })) },
      hinges:     { ...hingeFab.params },
    });
    if (hash) history.replaceState(null, '', hash);
  });

  const MODULE_TAGS: Record<string, string> = {
    gears:      'INVOLUTE SPUR GEARS',
    hinges:     'LIVING FLEX HINGES',
    kinetic:    'KINEMATIC MECHANISMS',
    enclosures: 'ELECTRONICS ENCLOSURES',
  };
</script>

<div class="app-shell">
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="wordmark">
        <span class="wordmark-primary">STUDIO</span>
        <span class="wordmark-sep">·</span>
        <span class="wordmark-secondary">FAB</span>
      </div>
      <div class="toolbar-divider"></div>
      <nav class="module-picker">
        {#each modules as mod (mod.id)}
          <button
            class="module-btn {mod.id === activeModule ? 'active' : ''} {mod.locked ? 'locked' : ''}"
            onclick={() => { if (!mod.locked) activeModule = mod.id; }}
          >
            {mod.label}
            {#if mod.locked}<span class="module-lock">···</span>{/if}
          </button>
        {/each}
      </nav>
    </div>

    <div class="toolbar-center">
      {#if activeModule === 'box'}
        <div class="view-toggle">
          <div
            class="view-indicator"
            style="transform: translateX({view === 'flat' ? '0%' : view === 'assembled' ? '100%' : '200%'})"
          ></div>
          <button class="view-btn {view === 'flat' ? 'active' : ''}"      onclick={() => view = 'flat'}>FLAT</button>
          <button class="view-btn {view === 'assembled' ? 'active' : ''}" onclick={() => view = 'assembled'}>ASSEMBLED</button>
          <button class="view-btn locked" title="Phase 3">SIMULATION <span class="module-lock">···</span></button>
        </div>
      {:else if activeModule === 'gears'}
        <div class="view-toggle">
          <div
            class="view-indicator"
            style="transform: translateX({gearView === '2d' ? '0%' : gearView === 'blueprint' ? '100%' : '200%'})"
          ></div>
          <button class="view-btn {gearView === '2d' ? 'active' : ''}"        onclick={() => gearView = '2d'}>2D  FLAT</button>
          <button class="view-btn {gearView === 'blueprint' ? 'active' : ''}" onclick={() => gearView = 'blueprint'}>BLUEPRINT</button>
          <button class="view-btn {gearView === '3d' ? 'active' : ''} {gearMode !== 'spur' ? 'locked' : ''}"
            onclick={() => { if (gearMode === 'spur') gearView = '3d'; }}>3D  PRINT</button>
        </div>
      {:else if activeModule === 'enclosures'}
        <div class="view-toggle" data-count="2">
          <div
            class="view-indicator"
            style="transform: translateX({encView === '2d' ? '0%' : '100%'})"
          ></div>
          <button class="view-btn {encView === '2d' ? 'active' : ''}" onclick={() => encView = '2d'}>PANEL EDITOR</button>
          <button class="view-btn {encView === '3d' ? 'active' : ''}" onclick={() => encView = '3d'}>3D  VIEW</button>
        </div>
      {:else if MODULE_TAGS[activeModule]}
        <div class="toolbar-module-tag">{MODULE_TAGS[activeModule]}</div>
      {/if}
    </div>

    <div class="toolbar-right">
      {#if activeModule === 'box'}
        <div class="status-pill {statusClass}">
          <span class="status-dot"></span>
          <span class="status-text">{statusText}</span>
        </div>
      {/if}
      <button class="unit-toggle" onclick={() => units.toggle()} title="Toggle mm / inches">
        {units.label}
      </button>
      <button class="guide-btn" onclick={() => showGuide = true} title="Fabrication guide — plain language help">
        ?
      </button>
      <button class="credits-btn" onclick={() => showCredits = true} title="Open source credits">
        CREDITS
      </button>
    </div>
  </header>

  <div class="main-grid">
    <!-- Left panel -->
    {#if activeModule === 'box'}
      <LeftPanel />
    {:else if activeModule === 'gears'}
      <GearLeftPanel />
    {:else if activeModule === 'hinges'}
      <HingeLeftPanel />
    {:else if activeModule === 'kinetic'}
      <KineticLeftPanel />
    {:else if activeModule === 'enclosures'}
      <EnclosureLeftPanel />
    {:else}
      <div class="panel-left"></div>
    {/if}

    <!-- Workspace -->
    <div class="workspace">
      <div class="workspace-header">
        {#if activeModule === 'box'}
          <span class="workspace-label">FABRICATION LAYOUT</span>
          <div class="workspace-meta">
            <span>{fab.params.width}×{fab.params.height}×{fab.params.depth}</span>
            <span class="meta-sep">·</span>
            <span>{fab.panels.length} panels</span>
            <span class="meta-sep">·</span>
            <span>{fab.params.thickness}mm</span>
          </div>
        {:else if activeModule === 'gears'}
          <span class="workspace-label">{gearView === '3d' ? '3D PRINT PREVIEW' : gearMode === 'planetary' ? 'PLANETARY GEARSET' : 'GEAR TRAIN PREVIEW'}</span>
          <div class="workspace-meta"><span>{gearView === '3d' ? 'STL · OBJ EXPORT' : gearView === 'blueprint' ? 'BLUEPRINT VIEW' : '@dromney/gear-gen'}</span></div>
        {:else if activeModule === 'hinges'}
          <span class="workspace-label">FLEX ZONE PREVIEW</span>
          <div class="workspace-meta"><span>LIVING HINGE PATTERN</span></div>
        {:else if activeModule === 'kinetic'}
          <span class="workspace-label">MECHANISM PREVIEW</span>
          <div class="workspace-meta"><span>KINEMATIC SIMULATION</span></div>
        {:else if activeModule === 'enclosures'}
          <span class="workspace-label">{encView === '3d' ? '3D ASSEMBLY' : 'PANEL EDITOR'}</span>
          <div class="workspace-meta"><span>{encView === '3d' ? 'DRAG TO ORBIT · SCROLL TO ZOOM' : 'CLICK TO SELECT · EDIT IN LEFT PANEL'}</span></div>
        {/if}
      </div>
      <div class="workspace-canvas">
        {#if activeModule === 'gears'}
          {#if gearView === '3d' && gearMode === 'spur'}
            {#if GearThreeView}
              <GearThreeView />
            {:else}
              <div class="phase-placeholder">
                <div class="phase-placeholder-label">LOADING 3D</div>
              </div>
            {/if}
          {:else if gearMode === 'planetary'}
            <PlanetaryView blueprint={gearView === 'blueprint'} />
          {:else if gearMode === 'rack'}
            <RackPinionView blueprint={gearView === 'blueprint'} />
          {:else}
            <GearView blueprint={gearView === 'blueprint'} />
          {/if}
        {:else if activeModule === 'hinges'}
          <HingeView />
        {:else if activeModule === 'kinetic'}
          <KineticView />
        {:else if activeModule === 'enclosures'}
          {#if encView === '3d'}
            {#if EnclosureThreeView}
              <EnclosureThreeView />
            {:else}
              <div class="phase-placeholder">
                <div class="phase-placeholder-label">LOADING 3D</div>
              </div>
            {/if}
          {:else}
            <EnclosureView />
          {/if}
        {:else if view === 'flat'}
          <FabricationView panels={fab.panels} params={fab.params} />
        {:else if view === 'assembled'}
          {#if AssemblyView}
            <AssemblyView panels={fab.panels} params={fab.params} />
          {:else}
            <div class="phase-placeholder">
              <div class="phase-placeholder-label">LOADING 3D</div>
            </div>
          {/if}
        {:else}
          <div class="phase-placeholder">
            <div class="phase-placeholder-label">SIMULATION</div>
            <div class="phase-placeholder-sub">COMING SOON</div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right panel -->
    {#if activeModule === 'box'}
      <RightPanel />
    {:else if activeModule === 'gears'}
      <GearRightPanel />
    {:else if activeModule === 'hinges'}
      <HingeRightPanel />
    {:else if activeModule === 'kinetic'}
      <KineticRightPanel />
    {:else if activeModule === 'enclosures'}
      <EnclosureRightPanel />
    {:else}
      <div class="panel-right"></div>
    {/if}
  </div>
</div>

{#if showCredits}
  <CreditsView onclose={() => showCredits = false} />
{/if}

{#if showGuide}
  <GuideView module={activeModule} onclose={() => showGuide = false} />
{/if}

<style>
  .toolbar-module-tag {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    color: var(--g600);
    padding: 5px 12px;
    border: 1px solid var(--g200);
  }

  .guide-btn {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--white);
    background: var(--orange);
    border: 1px solid var(--orange);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .guide-btn:hover {
    background: var(--orange-d);
    border-color: var(--orange-d);
  }

  .credits-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--g600);
    background: none;
    border: 1px solid transparent;
    padding: 5px 10px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    height: 28px;
    display: flex;
    align-items: center;
  }
  .credits-btn:hover {
    border-color: var(--g200);
    color: var(--black);
  }

  .unit-toggle {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    color: var(--g600);
    background: none;
    border: 1px solid var(--g200);
    padding: 5px 10px;
    cursor: pointer;
    height: 28px;
    display: flex;
    align-items: center;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    min-width: 42px;
    justify-content: center;
  }
  .unit-toggle:hover {
    border-color: var(--orange);
    color: var(--orange);
  }
</style>
