import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatShortDate } from "../../utils/dateHelpers";

function JapaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-brown-900/10 bg-cream-50 px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-brown-700">{formatShortDate(label)}</p>
      <p className="text-saffron-600">{payload[0].value} rounds</p>
    </div>
  );
}

export default function JapaRoundsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="#f9e2e9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatShortDate(value)}
          tick={{ fontSize: 11, fill: "#7a5b64" }}
          axisLine={{ stroke: "#f9e2e9" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis domain={[0, "dataMax + 4"]} tick={{ fontSize: 11, fill: "#7a5b64" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<JapaTooltip />} cursor={{ fill: "rgba(184,63,109,0.06)" }} />
        <Bar dataKey="japaRounds" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.date} fill={entry.japaRounds >= 16 ? "#d1618f" : "#f0a8c4"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
