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

interface CostTableProps {
  data: DashboardData;
}

export function CostTable({ data }: CostTableProps) {
  const { accounts, costMap } = data;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Calculate monthly totals
  const monthlyTotals: Record<number, number> = {};
  for (const month of months) {
    monthlyTotals[month] = accounts.reduce((sum, account) => {
      return sum + (costMap[account.id]?.[month]?.amount || 0);
    }, 0);
  }

  // Calculate account totals
  const accountTotals: Record<number, number> = {};
  for (const account of accounts) {
    accountTotals[account.id] = months.reduce((sum, month) => {
      return sum + (costMap[account.id]?.[month]?.amount || 0);
    }, 0);
  }

  const grandTotal = Object.values(accountTotals).reduce((a, b) => a + b, 0);

  // Only show accounts that have any costs
  const activeAccounts = accounts.filter((a) => accountTotals[a.id] > 0);

  if (activeAccounts.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No cost data for this year. Add costs from the Costs page.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background min-w-[140px]">
              Account
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
          {activeAccounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: account.color || "#6366f1" }}
                  />
                  <div>
                    <div>{account.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {account.entityName ? `${account.entityName} / ${account.serviceName}` : account.serviceName}
                    </div>
                  </div>
                </div>
              </TableCell>
              {months.map((month) => {
                const entry = costMap[account.id]?.[month];
                return (
                  <TableCell
                    key={month}
                    className={`text-right tabular-nums ${
                      entry?.paymentStatus === "overdue"
                        ? "text-red-600 font-semibold"
                        : entry?.paymentStatus === "pending"
                        ? "text-yellow-600"
                        : entry?.source === "api"
                        ? "text-blue-600"
                        : ""
                    }`}
                    title={entry?.paymentStatus ? `Status: ${entry.paymentStatus}` : undefined}
                  >
                    {entry ? formatCurrency(entry.amount) : "-"}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(accountTotals[account.id])}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold border-t-2">
            <TableCell className="sticky left-0 z-10 bg-background">
              Total
            </TableCell>
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
