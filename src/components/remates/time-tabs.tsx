'use client'

export type TimePeriod = 'hoy' | 'proximos7' | 'pasados'

interface TimeTabsProps {
  value: TimePeriod
  onChange: (period: TimePeriod) => void
  counts: Record<TimePeriod, number>
}

const tabs: { key: TimePeriod; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'proximos7', label: 'Pr\u00f3ximos 7 d\u00edas' },
  { key: 'pasados', label: 'Pasados' },
]

export default function TimeTabs({ value, onChange, counts }: TimeTabsProps) {
  return (
    <div className="inline-flex bg-white rounded-xl border border-stone-200 p-1 shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            value === tab.key
              ? 'bg-campo-900 text-white shadow-md'
              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          {tab.label}
          {counts[tab.key] > 0 && (
            <span
              className={`ml-2 text-[11px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold ${
                value === tab.key
                  ? 'bg-campo-700 text-campo-100'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {counts[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
