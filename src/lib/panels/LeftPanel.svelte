<script lang="ts">
  import NumInput from '$lib/components/NumInput.svelte';
  import SegControl from '$lib/components/SegControl.svelte';
  import Slider from '$lib/components/Slider.svelte';
  import { fab } from '$stores/fabrication.svelte';
  import { units } from '$stores/units.svelte';
  import { BOX_TYPE_DEFS } from '$modules/boxes/types';

  const jointOptions = [
    { value: 'finger', label: 'FINGER' },
    { value: 'plain',  label: 'PLAIN'  },
  ];

  const materialOptions = [
    { value: 'plywood',   label: 'PLY'     },
    { value: 'mdf',       label: 'MDF'     },
    { value: 'acrylic',   label: 'ACRYLIC' },
    { value: 'cardboard', label: 'CARD'    },
  ];

  const MATERIAL_PRESETS: Record<string, { thickness: number; kerf: number }> = {
    plywood:   { thickness: 3,   kerf: 0.10 },
    mdf:       { thickness: 3,   kerf: 0.12 },
    acrylic:   { thickness: 3,   kerf: 0.08 },
    cardboard: { thickness: 2,   kerf: 0.05 },
  };


  function setMaterial(v: unknown) {
    const mat = v as string;
    const preset = MATERIAL_PRESETS[mat];
    fab.update({ material: mat, ...(preset ?? {}) });
  }
</script>

<div class="panel-left">
  <!-- BOX TYPE -->
  <section class="panel-section">
    <div class="section-label">BOX TYPE</div>
    <div class="box-type-grid">
      {#each BOX_TYPE_DEFS as def (def.id)}
        <button
          class="box-type-btn {fab.params.boxType === def.id ? 'active' : ''}"
          onclick={() => fab.update({ boxType: def.id })}
          title={def.description}
        >{def.label}</button>
      {/each}
    </div>
  </section>

  <!-- DIMENSIONS -->
  <section class="panel-section">
    <div class="section-label">DIMENSIONS <span class="section-label-tag">{units.label}</span></div>
    <NumInput label="WIDTH"  value={units.toDisplay(fab.params.width)}  min={units.toDisplay(10)} max={units.toDisplay(2000)} step={units.dimStep()}   onchange={v => fab.update({ width:  units.fromDisplay(v) })} />
    <NumInput label="HEIGHT" value={units.toDisplay(fab.params.height)} min={units.toDisplay(10)} max={units.toDisplay(2000)} step={units.dimStep()}   onchange={v => fab.update({ height: units.fromDisplay(v) })} />
    <NumInput label="DEPTH"  value={units.toDisplay(fab.params.depth)}  min={units.toDisplay(10)} max={units.toDisplay(2000)} step={units.dimStep()}   onchange={v => fab.update({ depth:  units.fromDisplay(v) })} />
  </section>

  <!-- MATERIAL -->
  <section class="panel-section">
    <div class="section-label">MATERIAL</div>
    <SegControl value={fab.params.material} options={materialOptions} onchange={setMaterial} />
    <div style="margin-top:10px">
      <NumInput label="THICKNESS" value={units.toDisplay(fab.params.thickness)} min={units.toDisplay(0.5)} max={units.toDisplay(25)} step={units.thickStep()} onchange={v => fab.update({ thickness: units.fromDisplay(v) })} />
    </div>
    <NumInput label="KERF" value={fab.params.kerf} min={0} max={1} step={0.01} onchange={v => fab.update({ kerf: v })} />
  </section>

  <!-- JOINTS -->
  <section class="panel-section">
    <div class="section-label">JOINTS</div>
    <SegControl value={fab.params.joint} options={jointOptions} onchange={v => fab.update({ joint: v as 'finger' | 'plain' })} />
    {#if fab.params.joint === 'finger'}
      <div style="margin-top:10px">
        <Slider label="FINGER COUNT" value={fab.params.fingerCount} min={2} max={20} step={1} onchange={v => fab.update({ fingerCount: v })} />
      </div>
    {/if}
  </section>

  <!-- TYPE OPTIONS (conditional) -->
  {#if fab.params.boxType === 'hinged'}
    <section class="panel-section">
      <div class="section-label">HINGE</div>
      <NumInput label="HINGE HEIGHT" value={fab.params.hingeH} min={10} max={100} step={1} onchange={v => fab.update({ hingeH: v })} />
    </section>
  {/if}

  {#if fab.params.boxType === 'multi'}
    <section class="panel-section">
      <div class="section-label">SECTIONS</div>
      <NumInput label="COLUMNS (X)" value={fab.params.sectionsX} min={2} max={8} step={1} onchange={v => fab.update({ sectionsX: v })} />
      <NumInput label="ROWS (Y)"    value={fab.params.sectionsY} min={2} max={8} step={1} onchange={v => fab.update({ sectionsY: v })} />
    </section>
  {/if}

</div>
