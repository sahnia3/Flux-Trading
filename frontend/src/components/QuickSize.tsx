"use client";

type Props = {
  onSelect: (fraction: number) => void;
  disabled?: boolean;
  labels?: [string, string, string];
};

export function QuickSize({ onSelect, disabled, labels = ["1/4", "1/2", "Max"] }: Props) {
  const options = [0.25, 0.5, 1];
  return (
    <div className="flex gap-2">
      {options.map((f, i) => (
        <button
          key={f}
          disabled={disabled}
          className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400 disabled:opacity-50"
          onClick={() => onSelect(f)}
        >
          {labels[i] ?? `${f * 100}%`}
        </button>
      ))}
    </div>
  );
}
