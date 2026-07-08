"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatPEN, STORES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface PriceHistoryPoint {
  date: string; // ISO
  price: number;
  store: string;
}

const STORE_COLORS: Record<string, string> = {
  amazon: "#fbbf24",   // amber
  temu: "#fb923c",     // orange
  falabella: "#34d399", // emerald
  other: "#a3a3a3",
};

export function PriceHistoryChart({ data }: { data: PriceHistoryPoint[] }) {
  if (data.length === 0) return null;

  // Group by date + store, pivot for the chart
  const stores = [...new Set(data.map((d) => d.store))];
  const byDate = new Map<string, Record<string, number>>();
  for (const p of data) {
    const dateKey = p.date.slice(0, 10); // YYYY-MM-DD
    if (!byDate.has(dateKey)) byDate.set(dateKey, {});
    byDate.get(dateKey)![p.store] = p.price;
  }
  const chartData = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, prices]) => ({
      date: new Date(date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
      ...prices,
    }));

  // Calculate trend (first vs last avg price)
  const allPrices = data.map((d) => d.price).sort((a, b) => a - b);
  const minPrice = allPrices[0];
  const maxPrice = allPrices[allPrices.length - 1];
  const firstPrices = chartData[0];
  const lastPrices = chartData[chartData.length - 1];
  const firstAvg = stores.reduce((s, st) => s + (firstPrices[st] ?? 0), 0) / stores.length;
  const lastAvg = stores.reduce((s, st) => s + (lastPrices[st] ?? 0), 0) / stores.length;
  const trend = lastAvg - firstAvg;
  const trendPercent = firstAvg > 0 ? Math.round((trend / firstAvg) * 100) : 0;

  const TrendIcon = trend < -0.5 ? TrendingDown : trend > 0.5 ? TrendingUp : Minus;
  const trendColor = trend < -0.5 ? "text-emerald-400" : trend > 0.5 ? "text-rose-400" : "text-muted-foreground";
  const trendLabel = trend < -0.5 ? "Bajó" : trend > 0.5 ? "Subió" : "Estable";

  return (
    <div className="rounded-3xl border border-border/40 glass p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <TrendingIcon />
          </span>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Historial de precios
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {data.length} registros · {stores.length} tienda{stores.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {/* Trend badge */}
        <div className={cn("flex items-center gap-1.5 rounded-full border border-border/40 bg-card/40 px-3 py-1.5 text-xs font-semibold", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trendLabel} {Math.abs(trendPercent)}%
        </div>
      </div>

      {/* Price range summary */}
      <div className="mb-4 flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">
          Mínimo: <span className="font-bold text-emerald-400">{formatPEN(minPrice)}</span>
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground">
          Máximo: <span className="font-bold text-rose-400">{formatPEN(maxPrice)}</span>
        </span>
      </div>

      {/* Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "oklch(0.7 0.01 264)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.7 0.01 264)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `S/${v}`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.2 0.007 264 / 0.95)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                backdropFilter: "blur(8px)",
              }}
              labelStyle={{ color: "oklch(0.97 0.004 264)" }}
              formatter={(value: number, name: string) => [
                formatPEN(value),
                STORES[name as keyof typeof STORES]?.label ?? name,
              ]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: "oklch(0.7 0.01 264)", fontSize: "11px" }}>
                  {STORES[value as keyof typeof STORES]?.label ?? value}
                </span>
              )}
            />
            {stores.map((store) => (
              <Line
                key={store}
                type="monotone"
                dataKey={store}
                stroke={STORE_COLORS[store] ?? "#a3a3a3"}
                strokeWidth={2.5}
                dot={{ r: 3, fill: STORE_COLORS[store] ?? "#a3a3a3" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendingIcon() {
  return (
    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7v6h-6" />
    </svg>
  );
}
