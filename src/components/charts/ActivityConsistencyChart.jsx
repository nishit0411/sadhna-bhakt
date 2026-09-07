import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function ConsistencyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-brown-900/10 bg-cream-50 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-brown-700">{item.label}</p>
      <p className="text-sage-600">{item.value}% of days</p>
    </div>
  );
}

const toneColor = (value) => (value >= 80 ? "#6b8f53" : value >= 60 ? "#b6924f" : "#c97a6c");

export default function ActivityConsistencyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#f0e4cb" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#8a7b6c" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#4a3b2e" }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip content={<ConsistencyTooltip />} cursor={{ fill: "rgba(122,46,58,0.06)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={toneColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
