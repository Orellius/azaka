// Tiny dependency-free SVG charts for the historical dashboard. SVG (not HTML+CSS) keeps bar sizing
// in element attributes rather than inline styles, and gives precise control over the dark RTL look.

export function VBars({ values, labels, color = '#ff2532' }: { values: number[]; labels?: string[]; color?: string }) {
  const max = Math.max(1, ...values)
  const n = values.length
  const bw = 100 / n
  return (
    <div dir="ltr" className="flex flex-col gap-1">
      <svg className="h-24 w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {values.map((v, i) => {
          const h = (v / max) * 100
          return <rect key={i} x={i * bw + bw * 0.14} y={100 - h} width={bw * 0.72} height={h} fill={color} opacity={v ? 1 : 0.25} />
        })}
      </svg>
      {labels && (
        <div className="flex justify-between text-[0.5625rem] text-fg-faint">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function BarList({
  rows,
  color = '#ff2532',
  max,
}: {
  rows: Array<{ label: string; value: number }>
  color?: string
  max?: number
}) {
  const peak = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-end text-[0.6875rem] text-fg-muted">{r.label}</span>
          <svg className="h-2.5 flex-1" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0" y="0" width="100" height="8" rx="2" fill="#ffffff" opacity="0.05" />
            <rect x="0" y="0" width={(r.value / peak) * 100} height="8" rx="2" fill={color} />
          </svg>
          <span className="w-9 shrink-0 text-[0.6875rem] tabular-nums text-fg-muted">{r.value.toLocaleString('he-IL')}</span>
        </div>
      ))}
    </div>
  )
}
