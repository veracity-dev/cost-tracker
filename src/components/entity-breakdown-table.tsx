"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardData, MONTH_NAMES, formatCurrency } from "@/lib/types";

interface EntityBreakdownTableProps {
  data: DashboardData;
}

export function EntityBreakdownTable({ data }: EntityBreakdownTableProps) {
  const { accounts, entities, costMap } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Group costs by entity
  const entityCosts: Record<string, Record<number, number>> = {};
  for (const account of accounts) {
    const entityName = account.entityName || "Unassigned";
    if (!entityCosts[entityName]) entityCosts[entityName] = {};
    for (const month of months) {
      const amount = costMap[account.id]?.[month]?.amount || 0;
      entityCosts[entityName][month] = (entityCosts[entityName][month] || 0) + amount;
    }
  }

  // Entity colors
  const entityColorMap = new Map(entities.map((e) => [e.name, e.color || "#6366f1"]));

  // Calculate totals per entity
  const entityTotals: Record<string, number> = {};
  for (const [name, monthlyCosts] of Object.entries(entityCosts)) {
    entityTotals[name] = months.reduce((sum, m) => sum + (monthlyCosts[m] || 0), 0);
  }

  // Filter to entities with costs
  const activeEntities = Object.keys(entityCosts).filter((name) => entityTotals[name] > 0);

  if (activeEntities.length === 0) return null;

  // Monthly totals
  const monthlyTotals: Record<number, number> = {};
  for (const month of months) {
    monthlyTotals[month] = activeEntities.reduce(
      (sum, name) => sum + (entityCosts[name][month] || 0),
      0
    );
  }
  const grandTotal = activeEntities.reduce((sum, name) => sum + entityTotals[name], 0);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background min-w-[140px]">
              Entity
            </TableHead>
            {months.map((m) => (
              <TableHead key={m} className="text-right min-w-[90px]">
                {MONTH_NAMES[m - 1]}
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[100px] font-semibold">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeEntities.map((name) => (
            <TableRow key={name}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entityColorMap.get(name) || "#6366f1" }}
                  />
                  {name}
                </div>
              </TableCell>
              {months.map((month) => (
                <TableCell key={month} className="text-right tabular-nums">
                  {entityCosts[name][month] ? formatCurrency(entityCosts[name][month]) : "-"}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(entityTotals[name])}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold border-t-2">
            <TableCell className="sticky left-0 z-10 bg-background">Total</TableCell>
            {months.map((month) => (
              <TableCell key={month} className="text-right tabular-nums">
                {monthlyTotals[month] > 0 ? formatCurrency(monthlyTotals[month]) : "-"}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums">
              {formatCurrency(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
