'use client';

/**
 * BudgetSelector — Segmented control chọn ngân sách
 * Dùng chung cho Home page và Result page
 */

export type BudgetOption = 'auto' | '30000' | '50000' | '100000' | '200000';

interface BudgetSelectorProps {
  value: BudgetOption;
  onChange: (value: BudgetOption) => void;
}

const BUDGET_OPTIONS: { label: string; value: BudgetOption }[] = [
  { label: 'Auto', value: 'auto' },
  { label: '< 30k', value: '30000' },
  { label: '30k – 50k', value: '50000' },
  { label: '50k – 100k', value: '100000' },
  { label: '> 100k', value: '200000' },
];

export function BudgetSelector({ value, onChange }: BudgetSelectorProps) {
  return (
    <div className="flex items-center justify-start gap-1 flex-wrap">
      <span className="text-xs font-bold text-gray-500 dark:text-[#9A8A7A] mr-1 whitespace-nowrap">
        Ngân sách
      </span>
      {BUDGET_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${value === opt.value
            ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20 dark:shadow-brand/30'
            : 'bg-white dark:bg-[#3D312A] text-gray-500 dark:text-[#9A8A7A] border-gray-200 dark:border-[#4D3D32] hover:border-brand/50 dark:hover:border-brand/50 hover:text-brand dark:hover:text-brand'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Chuyển BudgetOption sang Object {min, max} VND để gửi lên API
 */
export function budgetToRange(budget: BudgetOption): { min: number; max: number } | null {
  switch (budget) {
    case 'auto': return null;
    case '30000': return { min: 0, max: 30000 };
    case '50000': return { min: 30000, max: 50000 };
    case '100000': return { min: 50000, max: 100000 };
    case '200000': return { min: 100000, max: 10000000 };
    default: return null;
  }
}
