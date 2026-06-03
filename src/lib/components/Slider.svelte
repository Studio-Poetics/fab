<script lang="ts">
  interface Props {
    value:    number;
    label:    string;
    min?:     number;
    max?:     number;
    step?:    number;
    unit?:    string;
    onchange?: (v: number) => void;
  }

  let { value = $bindable(), label, min = 0, max = 100, step = 1, unit = '', onchange }: Props = $props();

  function handleInput(e: Event) {
    value = parseFloat((e.target as HTMLInputElement).value);
    onchange?.(value);
  }
</script>

<div class="field">
  <div class="field-label">
    <span>{label}</span>
    {#if unit}<span class="field-unit">{unit}</span>{/if}
  </div>
  <div class="slider-wrap">
    <input
      class="slider-track"
      type="range"
      {min} {max} {step}
      {value}
      oninput={handleInput}
    />
    <span class="slider-val">{value}</span>
  </div>
</div>
