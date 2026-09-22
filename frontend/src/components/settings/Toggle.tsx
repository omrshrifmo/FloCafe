'use client';

type ToggleProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  'aria-label'?: string;
};

export function Toggle({
  value,
  onChange,
  label,
  disabled,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-brand' : 'bg-gray-300 dark:bg-input'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className={`absolute top-0.5 start-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${value ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}
