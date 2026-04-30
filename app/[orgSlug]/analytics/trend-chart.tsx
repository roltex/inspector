"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function TrendChart({
  data,
}: {
  data: { day: string; observations: number; incidents: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data yet — log some observations or incidents to see trends.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="o" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="i" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="observations"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#o)"
        />
        <Area
          type="monotone"
          dataKey="incidents"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          fill="url(#i)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
