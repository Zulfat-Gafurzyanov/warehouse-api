import "./BarChart.css";

interface BarChartPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartPoint[];
  formatValue?: (value: number) => string;
  color?: string;
}

export function BarChart({ data, formatValue, color = "#2f6f6a" }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className="bar-chart">
      <div className="bar-chart__bars">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          return (
            <div className="bar-chart__col" key={i}>
              <div className="bar-chart__value">{d.value > 0 ? fmt(d.value) : ""}</div>
              <div className="bar-chart__track">
                <div
                  className="bar-chart__bar"
                  style={{ height: `${heightPct}%`, background: color }}
                  title={`${d.label}: ${fmt(d.value)}`}
                />
              </div>
              <div className="bar-chart__label">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { BarChartPoint };
