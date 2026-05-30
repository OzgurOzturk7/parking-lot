"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, type ExitResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";

type BlockedInfo = { plate: string; balance: number; message: string };

export default function ExitPage() {
  const [plate, setPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExitResponse | null>(null);
  const [blocked, setBlocked] = useState<BlockedInfo | null>(null);

  const submit = async () => {
    if (!plate) {
      toast.warning("Type a plate first");
      return;
    }
    setSubmitting(true);
    setBlocked(null);
    setResult(null);
    try {
      const r = await api.exit(plate.trim().toUpperCase());
      setResult(r);
      toast.success(`Exit cleared · ${formatCurrency(r.total_fee)}`);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403 && err.code === "PAYMENT_REQUIRED") {
        const bal =
          typeof err.details.outstanding_balance === "number"
            ? err.details.outstanding_balance
            : parseFloat(String(err.details.outstanding_balance ?? "0"));
        setBlocked({
          plate: String(err.details.license_plate ?? plate),
          balance: bal,
          message: err.message,
        });
      } else {
        toast.error(err.message || "Exit failed", { description: err.code });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Vehicle exit</h1>

      <div className="space-y-2">
        <Label htmlFor="plate">License plate</Label>
        <Input
          id="plate"
          placeholder="34ABC123"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-10 font-mono uppercase"
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">Press Enter to submit.</p>
      </div>

      <Button className="w-full h-10" disabled={submitting || !plate} onClick={submit}>
        {submitting ? "Closing..." : "Close session"}
      </Button>

      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPlate("34LIVE01")}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          try 34LIVE01 (active)
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={() => setPlate("34DBT999")}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          try 34DBT999 (flagged)
        </button>
      </div>

      {blocked && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
          <p className="text-xs font-medium text-destructive">Exit blocked · 403</p>
          <p className="mt-2 text-3xl font-semibold text-destructive tabular-nums">
            {formatCurrency(blocked.balance)}
          </p>
          <p className="mt-2 text-sm">{blocked.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Plate <span className="font-mono font-semibold">{blocked.plate}</span> cannot exit
            until the balance is cleared.
          </p>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-success/40 bg-success/5 p-5">
          <p className="text-xs font-medium text-success">
            Receipt · session #{result.session_id} · spot {result.spot_code}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {formatCurrency(result.total_fee)}
          </p>
          <p className="text-xs text-muted-foreground">
            {result.billed_units} {result.rate_plan.type === "per_hour" ? "hour(s)" : "minute(s)"} ·{" "}
            ${parseFloat(result.rate_plan.amount).toFixed(2)} per{" "}
            {result.rate_plan.type === "per_hour" ? "hour" : "minute"}
          </p>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Plate"><span className="font-mono">{result.license_plate}</span></Row>
            <Row label="Entry">{formatDateTime(result.entry_time)}</Row>
            <Row label="Exit">{formatDateTime(result.exit_time)}</Row>
            <Row label="Duration">{formatDuration(result.duration_minutes)}</Row>
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
