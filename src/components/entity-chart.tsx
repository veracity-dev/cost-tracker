"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardData, MONTH_NAMES } from "@/lib/types";

interface EntityChartProps {
  data: DashboardData;
}

export function EntityChart({ data }: EntityChartProps) {
  const { accounts, entities, costMap } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Build entity -> monthly totals by summing account costs per entity
  const entityTotals: Record<string, { name: string; color: string; monthly: Record<number, number> }> = {};

  for (const account of accounts) {
    const entityName = account.entityName || "Unassigned";
    const entity = entities.find((e) => e.id === account.entityId);
    const color = entity?.color || "#94a3b8";

    if (!entityTotals[entityName]) {
      entityTotals[entityName] = { name: entityName, color, monthly: {} };
    }

    for (const month of months) {
      const amount = costMap[account.id]?.[month]?.amount || 0;
      entityTotals[entityName].monthly[month] = (entityTotals[entityName].monthly[month] || 0) + amount;
    }
  }

  // Only include entities that have costs
  const activeEntities = Object.values(entityTotals).filter((e) =>
    months.some((m) => (e.monthly[m] || 0) > 0)
  );

  if (activeEntities.length === 0) {
    return null;
  }

  const chartData = months.map((month) => {
    const entry: Record<string, string | number> = {
      month: MONTH_NAMES[month - 1],
    };
    for (const entity of activeEntities) {
      entry[entity.name] = entity.monthly[month] || 0;
    }
    return entry;
  });

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis
            className="text-xs"
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            formatter={(value) =>
              `$${Number(value).toFixed(2)}`
            }
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend />
          {activeEntities.map((entity) => (
            <Bar
              key={entity.name}
              dataKey={entity.name}
              stackId="entities"
              fill={entity.color}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
