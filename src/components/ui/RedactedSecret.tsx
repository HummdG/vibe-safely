// A leaked secret shown already masked: a soft bar the width of the value, so the demo
// reads as "found it, and kept it hidden". The value is decorative/fake and stays covered;
// screen readers get "redacted". Sits inline in mono text.
export function RedactedSecret({ value }: { value: string }) {
  return (
    <span className="relative inline-block align-middle" aria-label="redacted">
      <span
        aria-hidden
        className="select-none rounded-[3px] bg-border-strong px-1 text-transparent"
      >
        {value}
      </span>
      <span className="sr-only">redacted</span>
    </span>
  );
}
