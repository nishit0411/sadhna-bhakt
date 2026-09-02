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

const toneColor = (value) => (value >= 80 ? "#6f9459" : value >= 60 ? "#d1618f" : "#e37e73");

export default function ActivityConsistencyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#f9e2e9" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#7a5b64" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#573c44" }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip content={<ConsistencyTooltip />} cursor={{ fill: "rgba(184,63,109,0.06)" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={toneColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
