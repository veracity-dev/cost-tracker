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

interface ServiceBreakdownTableProps {
  data: DashboardData;
}

export function ServiceBreakdownTable({ data }: ServiceBreakdownTableProps) {
  const { accounts, costMap } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Group costs by service type (serviceName)
  const serviceCosts: Record<string, Record<number, number>> = {};
  for (const account of accounts) {
    const serviceName = account.serviceName;
    if (!serviceCosts[serviceName]) serviceCosts[serviceName] = {};
    for (const month of months) {
      const amount = costMap[account.id]?.[month]?.amount || 0;
      serviceCosts[serviceName][month] = (serviceCosts[serviceName][month] || 0) + amount;
    }
  }

  // Calculate totals per service
  const serviceTotals: Record<string, number> = {};
  for (const [name, monthlyCosts] of Object.entries(serviceCosts)) {
    serviceTotals[name] = months.reduce((sum, m) => sum + (monthlyCosts[m] || 0), 0);
  }

  // Filter to services with costs, sorted by total desc
  const activeServices = Object.keys(serviceCosts)
    .filter((name) => serviceTotals[name] > 0)
    .sort((a, b) => serviceTotals[b] - serviceTotals[a]);

  if (activeServices.length === 0) return null;

  // Monthly totals
  const monthlyTotals: Record<number, number> = {};
  for (const month of months) {
    monthlyTotals[month] = activeServices.reduce(
      (sum, name) => sum + (serviceCosts[name][month] || 0),
      0
    );
  }
  const grandTotal = activeServices.reduce((sum, name) => sum + serviceTotals[name], 0);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background min-w-[140px]">
              Service Type
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
          {activeServices.map((name) => (
            <TableRow key={name}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                {name}
              </TableCell>
              {months.map((month) => (
                <TableCell key={month} className="text-right tabular-nums">
                  {serviceCosts[name][month] ? formatCurrency(serviceCosts[name][month]) : "-"}
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(serviceTotals[name])}
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
