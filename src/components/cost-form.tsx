"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceAccount, PaymentCard, Entity, MONTH_NAMES } from "@/lib/types";

interface CostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ServiceAccount[];
  entities: Entity[];
  cards: PaymentCard[];
  onSave: () => void;
  editData?: {
    id: number;
    accountId: number;
    year: number;
    month: number;
    amount: number;
    notes: string | null;
    paymentStatus: string | null;
    cardId: number | null;
  } | null;
}

export function CostForm({ open, onOpenChange, accounts, entities, cards, onSave, editData }: CostFormProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [entityId, setEntityId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState(currentMonth.toString());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [cardId, setCardId] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      const editAccount = accounts.find((a) => a.id === editData.accountId);
      setEntityId(editAccount?.entityId?.toString() || "");
      setAccountId(editData.accountId.toString());
      setYear(editData.year.toString());
      setMonth(editData.month.toString());
      setAmount(editData.amount.toString());
      setNotes(editData.notes || "");
      setPaymentStatus(editData.paymentStatus || "pending");
      setCardId(editData.cardId?.toString() || "none");
    } else {
      setEntityId("");
      setAccountId("");
      setYear(currentYear.toString());
      setMonth(currentMonth.toString());
      setAmount("");
      setNotes("");
      setPaymentStatus("pending");
      const defaultCard = cards.find((c) => c.isDefault);
      setCardId(defaultCard ? defaultCard.id.toString() : "none");
    }
  }, [editData, open, currentYear, currentMonth, cards, accounts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editData) {
        await fetch(`/api/costs/${editData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(parseFloat(amount) * 100) / 100,
            notes: notes || null,
            paymentStatus,
            cardId: cardId === "none" ? null : parseInt(cardId),
          }),
        });
      } else {
        await fetch("/api/costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: parseInt(accountId),
            year: parseInt(year),
            month: parseInt(month),
            amount: Math.round(parseFloat(amount) * 100) / 100,
            notes: notes || null,
            paymentStatus,
            cardId: cardId === "none" ? null : parseInt(cardId),
          }),
        });
      }
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Filter accounts by selected entity
  const filteredAccounts = entityId
    ? accounts.filter((a) => a.entityId?.toString() === entityId)
    : accounts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Cost" : "Add Cost"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity</Label>
              <Select
                value={entityId}
                onValueChange={(val) => {
                  setEntityId(val);
                  setAccountId("");
                }}
                disabled={!!editData}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account</Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
                disabled={!!editData || !entityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={entityId ? "Select account" : "Select entity first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear} disabled={!!editData}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth} disabled={!!editData}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Card</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No card</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id.toString()}>
                      {card.label}{card.last4 ? ` •${card.last4}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !accountId || !amount}>
              {saving ? "Saving..." : editData ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
