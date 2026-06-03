<script lang="ts">
  let { onclose }: { onclose: () => void } = $props();

  const deps = [
    {
      name:    'Studio Fab — Original BoxMaker',
      version: 'v1 (vanilla JS)',
      author:  'Studio Poetics',
      purpose: 'Original parametric box generator — panel geometry, finger-joint algorithm, DXF R12 exporter, and 6 box type definitions that form the foundation of the BOX module',
      license: 'Proprietary',
      url:     'https://poetics.studio',
      tag:     'BOX MODULE',
    },
    {
      name:    'boxes.py',
      version: '—',
      author:  'Florian Festi',
      purpose: 'Algorithmic reference for parametric laser-cut box types, finger-joint spacing formulae, and living-hinge integration patterns',
      license: 'GPL 3.0',
      url:     'https://github.com/florianfesti/boxes',
      tag:     'BOX ALGORITHM',
    },
    {
      name:    '@dromney/gear-gen',
      version: '0.2.11',
      author:  'Dallin Romney',
      purpose: 'Involute spur gear geometry, tooth-profile calculation, kinematic parent–child chaining, and SVG/DXF export',
      license: 'MIT',
      url:     'https://github.com/RomneyDa/gear-pattern-generator',
      tag:     'GEARS MODULE',
    },
    {
      name:    'Three.js',
      version: '0.171.0',
      author:  'mrdoob et al.',
      purpose: '3D WebGL rendering — box assembly view, orbital camera, PCF shadow mapping, lazy-loaded as a separate 120 kB chunk',
      license: 'MIT',
      url:     'https://threejs.org',
      tag:     'ASSEMBLY VIEW',
    },
    {
      name:    'Living Hinge Patterns',
      version: '—',
      author:  'Maker community',
      purpose: 'Kerf, wave, and cross-lattice flex-hinge algorithms adapted from open-source laser-cutting community research and published pattern calculators',
      license: 'Public domain / CC',
      url:     'https://www.instructables.com/How-to-Make-Living-Hinges',
      tag:     'HINGES MODULE',
    },
    {
      name:    'Kinematics Reference',
      version: '—',
      author:  'Wikipedia contributors',
      purpose: 'Crank-slider and Scotch-yoke kinematic equations used in the KINETIC module mechanism simulation and cut-part generation',
      license: 'CC BY-SA',
      url:     'https://en.wikipedia.org/wiki/Scotch_yoke',
      tag:     'KINETIC MODULE',
    },
    {
      name:    'Svelte',
      version: '5.x',
      author:  'Rich Harris & contributors',
      purpose: 'Reactive UI framework — runes API ($state, $derived, $derived.by, $effect), compiled zero-runtime components',
      license: 'MIT',
      url:     'https://svelte.dev',
      tag:     'FRAMEWORK',
    },
    {
      name:    'Vite',
      version: '6.4.3',
      author:  'Evan You & contributors',
      purpose: 'Build tooling — instant HMR, code-splitting (Three.js lazy chunk), GitHub Pages optimised static output',
      license: 'MIT',
      url:     'https://vitejs.dev',
      tag:     'BUILD',
    },
    {
      name:    'TypeScript',
      version: '5.x',
      author:  'Microsoft',
      purpose: 'Type-safe JavaScript — strict mode, bundler module resolution, path aliases',
      license: 'Apache 2.0',
      url:     'https://www.typescriptlang.org',
      tag:     'LANGUAGE',
    },
    {
      name:    'IBM Plex',
      version: '—',
      author:  'IBM',
      purpose: 'Typography — IBM Plex Sans (UI prose) + IBM Plex Mono (all numbers, labels, readouts, code)',
      license: 'SIL OFL 1.1',
      url:     'https://www.ibm.com/plex',
      tag:     'TYPOGRAPHY',
    },
  ];

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

<div class="credits-backdrop" role="presentation" onclick={handleBackdrop}>
  <div class="credits-panel" role="dialog" aria-modal="true" aria-label="Credits">

    <div class="credits-header">
      <div class="credits-title-block">
        <div class="credits-wordmark">STUDIO <span class="sep">·</span> FAB</div>
        <div class="credits-subtitle">OPEN SOURCE ATTRIBUTIONS</div>
      </div>
      <button class="credits-close" onclick={onclose} aria-label="Close">✕</button>
    </div>

    <div class="credits-grid">
      {#each deps as dep}
        <div class="credit-card">
          <div class="credit-top">
            <span class="credit-tag">{dep.tag}</span>
            <span class="credit-license">{dep.license}</span>
          </div>
          <div class="credit-name">{dep.name}</div>
          <div class="credit-meta">
            <span class="credit-version">v{dep.version}</span>
            <span class="credit-dot">·</span>
            <span class="credit-author">{dep.author}</span>
          </div>
          <div class="credit-purpose">{dep.purpose}</div>
          <a class="credit-url" href={dep.url} target="_blank" rel="noopener noreferrer">{dep.url}</a>
        </div>
      {/each}
    </div>

    <div class="credits-footer">
      <a class="footer-link" href="https://poetics.studio" target="_blank" rel="noopener noreferrer">Built with precision by Studio Poetics</a>
      <span class="footer-sep">·</span>
      <span>All trademarks belong to their respective owners</span>
    </div>
  </div>
</div>

<style>
  .credits-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(12, 12, 11, 0.72);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .credits-panel {
    background: #F6F5F3;
    border: 1px solid #E2E1DC;
    width: min(860px, calc(100vw - 48px));
    max-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .credits-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 28px 32px 20px;
    border-bottom: 1px solid #E2E1DC;
    flex-shrink: 0;
  }

  .credits-wordmark {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    font-weight: 600;
    color: #0C0C0B;
    letter-spacing: 0.12em;
  }
  .credits-wordmark .sep { color: #AEADA9; }

  .credits-subtitle {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #5C5B57;
    letter-spacing: 0.18em;
    margin-top: 6px;
  }

  .credits-close {
    background: none;
    border: 1px solid #E2E1DC;
    color: #86857F;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
    transition: border-color 0.15s, color 0.15s;
  }
  .credits-close:hover { border-color: #0C0C0B; color: #0C0C0B; }

  .credits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1px;
    background: #E2E1DC;
    overflow-y: auto;
    flex: 1;
  }

  .credit-card {
    background: #F6F5F3;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: background 0.12s;
  }
  .credit-card:hover { background: #EDECE9; }

  .credit-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }

  .credit-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: #E85D04;
    background: rgba(232, 93, 4, 0.08);
    padding: 2px 6px;
  }

  .credit-license {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #5C5B57;
    letter-spacing: 0.1em;
  }

  .credit-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #0C0C0B;
    letter-spacing: -0.01em;
  }

  .credit-meta {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .credit-version, .credit-author {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #5C5B57;
    letter-spacing: 0.05em;
  }
  .credit-dot { color: #86857F; font-size: 11px; }

  .credit-purpose {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: #3D3D3A;
    line-height: 1.6;
    margin-top: 2px;
  }

  .credit-url {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #5C5B57;
    text-decoration: none;
    letter-spacing: 0.02em;
    margin-top: 4px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.12s;
  }
  .credit-url:hover { color: #0C0C0B; }

  .credits-footer {
    padding: 14px 32px;
    border-top: 1px solid #E2E1DC;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;
  }
  .credits-footer span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #5C5B57;
    letter-spacing: 0.08em;
  }
  .footer-sep { color: #AEADA9 !important; }
  .footer-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #5C5B57;
    letter-spacing: 0.08em;
    text-decoration: none;
    transition: color 0.12s;
  }
  .footer-link:hover { color: #0C0C0B; }
</style>
