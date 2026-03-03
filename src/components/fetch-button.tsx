"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2 } from "lucide-react";
import { MONTH_NAMES } from "@/lib/types";
import { toast } from "sonner";

interface FetchButtonProps {
  accountId: number;
  accountLabel: string;
  year: number;
  month: number;
  onSuccess?: () => void;
}

export function FetchButton({
  accountId,
  accountLabel,
  year,
  month,
  onSuccess,
}: FetchButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    try {
      const res = await fetch("/api/fetch-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, year, month }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`${accountLabel}: $${data.amount.toFixed(2)} fetched`);
        onSuccess?.();
      } else {
        toast.error(`${accountLabel}: ${data.error}`);
      }
    } catch {
      toast.error(`${accountLabel}: Failed to fetch`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFetch}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-3 w-3" />
      )}
      Fetch
    </Button>
  );
}

interface FetchAllButtonProps {
  accounts: { id: number; label: string; hasAutoFetch: boolean | null; fetcherSlug: string | null }[];
  year: number;
  onSuccess?: () => void;
}

export function FetchAllButton({
  accounts,
  year,
  onSuccess,
}: FetchAllButtonProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    (new Date().getMonth() + 1).toString()
  );

  async function handleFetchAll() {
    setLoading(true);
    const autoFetchAccounts = accounts.filter((a) => a.hasAutoFetch && a.fetcherSlug);
    const month = parseInt(selectedMonth);

    let successCount = 0;
    let failCount = 0;

    await Promise.allSettled(
      autoFetchAccounts.map(async (account) => {
        try {
          const res = await fetch("/api/fetch-costs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId: account.id,
              year,
              month,
            }),
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      })
    );

    if (successCount > 0) {
      toast.success(
        `Fetched ${successCount} account${successCount > 1 ? "s" : ""} for ${MONTH_NAMES[month - 1]} ${year}`
      );
    }
    if (failCount > 0) {
      toast.error(`Failed to fetch ${failCount} account${failCount > 1 ? "s" : ""}`);
    }

    onSuccess?.();
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[100px]">
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
      <Button onClick={handleFetchAll} disabled={loading} variant="outline">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Fetch All
      </Button>
    </div>
  );
}
