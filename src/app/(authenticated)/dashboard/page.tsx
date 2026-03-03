"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CostTable } from "@/components/cost-table";
import { CostChart } from "@/components/cost-chart";
import { EntityChart } from "@/components/entity-chart";
import { EntityBreakdownTable } from "@/components/entity-breakdown-table";
import { ServiceBreakdownTable } from "@/components/service-breakdown-table";
import { DashboardData, formatCurrency } from "@/lib/types";
import { FetchAllButton } from "@/components/fetch-button";
import { TrendingDown, TrendingUp, DollarSign, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [entityFilter, setEntityFilter] = useState("all");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year: year.toString() });
    if (entityFilter !== "all") params.set("entityId", entityFilter);
    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [year, entityFilter]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  function refreshData() {
    const params = new URLSearchParams({ year: year.toString() });
    if (entityFilter !== "all") params.set("entityId", entityFilter);
    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then(setData);
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <FetchAllButton
            accounts={data.accounts}
            year={year}
            onSuccess={refreshData}
          />
          {data.entities.length > 1 && (
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {data.entities.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.currentMonthTotal)}
            </div>
            {summary.monthOverMonthChange !== 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {summary.monthOverMonthChange > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                )}
                {summary.monthOverMonthChange > 0 ? "+" : ""}
                {summary.monthOverMonthChange.toFixed(1)}% from last month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Year Total ({year})
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.yearTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.accounts.filter((a) =>
                Object.keys(data.costMap[a.id] || {}).length > 0
              ).length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {data.accounts.length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.paidTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.pendingTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.overdueTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Costs by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <CostChart data={data} />
        </CardContent>
      </Card>

      {data.entities.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Costs by Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityChart data={data} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <CostTable data={data} />
        </CardContent>
      </Card>

      {data.entities.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityBreakdownTable data={data} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Service Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceBreakdownTable data={data} />
        </CardContent>
      </Card>
    </div>
  );
}
