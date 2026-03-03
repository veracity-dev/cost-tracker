"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CostForm } from "@/components/cost-form";
import { FetchButton, FetchAllButton } from "@/components/fetch-button";
import {
  ServiceAccount,
  Entity,
  PaymentCard,
  CostRecord,
  MONTH_NAMES,
  PAYMENT_STATUS_CONFIG,
  PaymentStatus,
  formatCurrency,
} from "@/lib/types";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function CostsPage() {
  const currentYear = new Date().getFullYear();
  const [costs, setCosts] = useState<CostRecord[]>([]);
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [year, setYear] = useState(currentYear.toString());
  const [entityFilter, setEntityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<{
    id: number;
    accountId: number;
    year: number;
    month: number;
    amount: number;
    notes: string | null;
    paymentStatus: string | null;
    cardId: number | null;
  } | null>(null);

  const fetchCosts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (entityFilter !== "all") params.set("entityId", entityFilter);
    Promise.all([
      fetch(`/api/costs?${params}`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/entities").then((r) => r.json()),
      fetch("/api/cards").then((r) => r.json()),
    ]).then(([costsData, accountsData, entitiesData, cardsData]) => {
      setCosts(costsData);
      setAccounts(accountsData);
      setEntities(entitiesData);
      setCards(cardsData);
      setLoading(false);
    });
  }, [year, entityFilter]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this cost record?")) return;
    await fetch(`/api/costs/${id}`, { method: "DELETE" });
    toast.success("Cost record deleted");
    fetchCosts();
  }

  async function handleStatusChange(id: number, status: string) {
    await fetch(`/api/costs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: status }),
    });
    toast.success(`Status updated to ${status}`);
    fetchCosts();
  }

  function handleEdit(cost: CostRecord) {
    setEditData({
      id: cost.id,
      accountId: cost.accountId,
      year: cost.year,
      month: cost.month,
      amount: cost.amount,
      notes: cost.notes,
      paymentStatus: cost.paymentStatus,
      cardId: cost.cardId,
    });
    setFormOpen(true);
  }

  function handleAdd() {
    setEditData(null);
    setFormOpen(true);
  }

  function handleSave() {
    toast.success(editData ? "Cost updated" : "Cost added");
    fetchCosts();
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Costs</h1>
        <div className="flex items-center gap-3">
          <FetchAllButton
            accounts={accounts}
            year={parseInt(year)}
            onSuccess={fetchCosts}
          />
          {entities.length > 1 && (
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={year} onValueChange={setYear}>
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
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : costs.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No cost records for {year}. Click &quot;Add Cost&quot; to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => {
                const status = (cost.paymentStatus || "pending") as PaymentStatus;
                const statusConfig = PAYMENT_STATUS_CONFIG[status];
                return (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cost.accountColor || "#6366f1" }}
                        />
                        {cost.accountLabel}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cost.entityName || "-"}
                    </TableCell>
                    <TableCell>
                      {MONTH_NAMES[cost.month - 1]} {cost.year}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(cost.amount)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status}
                        onValueChange={(v) => handleStatusChange(cost.id, v)}
                      >
                        <SelectTrigger className="h-7 w-[110px] border-0 p-0 px-2">
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {cost.cardLabel ? (
                        <div className="flex items-center gap-1 text-sm">
                          <CreditCard className="h-3 w-3" />
                          {cost.cardLabel}
                          {cost.cardLast4 && (
                            <span className="text-muted-foreground">
                              •{cost.cardLast4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cost.source === "api" ? "default" : "secondary"}>
                        {cost.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {cost.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {cost.hasAutoFetch && cost.fetcherSlug && (
                          <FetchButton
                            accountId={cost.accountId}
                            accountLabel={cost.accountLabel}
                            year={cost.year}
                            month={cost.month}
                            onSuccess={fetchCosts}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cost)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CostForm
        open={formOpen}
        onOpenChange={setFormOpen}
        accounts={accounts}
        entities={entities}
        cards={cards}
        onSave={handleSave}
        editData={editData}
      />
    </div>
  );
}
