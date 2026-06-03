<script lang="ts">
  interface Option<T> {
    value: T;
    label: string;
  }

  interface Props<T> {
    value:    T;
    options:  Option<T>[];
    onchange?: (v: T) => void;
  }

  let { value = $bindable(), options, onchange }: Props<unknown> = $props();
</script>

<div class="seg-control" data-cols={options.length}>
  {#each options as opt (opt.value)}
    <button
      class="seg-btn {value === opt.value ? 'active' : ''}"
      onclick={() => { value = opt.value; onchange?.(opt.value); }}
    >{opt.label}</button>
  {/each}
</div>
