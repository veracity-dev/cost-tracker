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

interface CostChartProps {
  data: DashboardData;
}

export function CostChart({ data }: CostChartProps) {
  const { accounts, costMap } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Only include accounts with costs
  const activeAccounts = accounts.filter((a) =>
    months.some((m) => costMap[a.id]?.[m]?.amount > 0)
  );

  // Display name: "EntityName / ServiceName" (or just "ServiceName" if no entity)
  function displayName(account: typeof accounts[number]) {
    if (account.entityName) {
      return `${account.entityName} / ${account.serviceName}`;
    }
    return account.serviceName;
  }

  const chartData = months.map((month) => {
    const entry: Record<string, string | number> = {
      month: MONTH_NAMES[month - 1],
    };
    for (const account of activeAccounts) {
      entry[displayName(account)] = costMap[account.id]?.[month]?.amount || 0;
    }
    return entry;
  });

  if (activeAccounts.length === 0) {
    return null;
  }

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
          {activeAccounts.map((account) => (
            <Bar
              key={account.id}
              dataKey={displayName(account)}
              stackId="costs"
              fill={account.color || "#6366f1"}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
