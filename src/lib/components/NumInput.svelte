<script lang="ts">
  interface Props {
    value:    number;
    label:    string;
    unit?:    string;
    min?:     number;
    max?:     number;
    step?:    number;
    onchange?: (v: number) => void;
  }

  let { value = $bindable(), label, unit = 'mm', min = 0, max = 9999, step = 1, onchange }: Props = $props();

  function clamp(v: number): number {
    return Math.min(max, Math.max(min, v));
  }

  function handleInput(e: Event) {
    const raw = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(raw)) {
      value = clamp(raw);
      onchange?.(value);
    }
  }

  function step_(delta: number) {
    value = clamp(value + delta * step);
    onchange?.(value);
  }
</script>

<div class="field">
  <div class="field-label">
    <span>{label}</span>
    {#if unit}<span class="field-unit">{unit}</span>{/if}
  </div>
  <div class="num-input-wrap">
    <input
      class="num-input"
      type="number"
      {min} {max} {step}
      value={value}
      oninput={handleInput}
    />
    <div class="field-stepper">
      <button class="stepper-btn" onclick={() => step_(1)} aria-label="Increase">▲</button>
      <button class="stepper-btn" onclick={() => step_(-1)} aria-label="Decrease">▼</button>
    </div>
  </div>
</div>
