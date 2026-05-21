"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertOctagon, ArrowRight, Check, RotateCcw } from "lucide-react";
import { api, ApiError, type ExitResponse } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  const reset = () => {
    setPlate("");
    setResult(null);
    setBlocked(null);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicle exit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Type the plate. The system finds the active session, calculates the fee, and frees the spot.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="plate" className="text-sm text-foreground">License plate</Label>
              <Input
                id="plate"
                placeholder="34ABC123"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="h-11 font-mono uppercase tracking-widest"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Press Enter to submit.</p>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" disabled={submitting || !plate} onClick={submit}>
                {submitting ? "Closing..." : "Close session"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" onClick={reset} aria-label="Reset">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2 border-t border-border pt-5">
              <p className="text-xs font-medium text-muted-foreground">Quick test</p>
              <div className="grid grid-cols-2 gap-2">
                <QuickPick label="34LIVE01" hint="active session" tone="success" onClick={() => setPlate("34LIVE01")} />
                <QuickPick label="34DBT999" hint="flagged plate" tone="destructive" onClick={() => setPlate("34DBT999")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {blocked ? (
            <Card className="border-destructive/40">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                    <AlertOctagon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-destructive">Exit blocked</p>
                    <p className="text-xs text-muted-foreground">403 · payment required</p>
                  </div>
                </div>

                <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-5">
                  <p className="text-xs text-muted-foreground">Outstanding balance</p>
                  <p className="mt-1 text-4xl font-semibold text-destructive tabular-nums">
                    {formatCurrency(blocked.balance)}
                  </p>
                  <p className="mt-3 text-sm text-foreground">{blocked.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Plate <span className="font-mono font-semibold">{blocked.plate}</span> cannot
                    exit any lot in the network until the balance is cleared from the admin panel.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : result ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Receipt ready</p>
                    <p className="text-xs text-muted-foreground">Session #{result.session_id} · spot {result.spot_code}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
                    {formatCurrency(result.total_fee)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.billed_units} {result.rate_plan.type === "per_hour" ? "hour(s)" : "minute(s)"} ·{" "}
                    ${parseFloat(result.rate_plan.amount).toFixed(2)} per{" "}
                    {result.rate_plan.type === "per_hour" ? "hour" : "minute"}
                  </p>
                </div>

                <dl className="mt-6 space-y-2.5 text-sm">
                  <Row label="Plate"><span className="font-mono">{result.license_plate}</span></Row>
                  <Row label="Entry">{formatDateTime(result.entry_time)}</Row>
                  <Row label="Exit">{formatDateTime(result.exit_time)}</Row>
                  <Row label="Duration">{formatDuration(result.duration_minutes)}</Row>
                  {result.rate_plan.grace_minutes > 0 && (
                    <Row label="Grace"><Badge variant="success">{result.rate_plan.grace_minutes} min free</Badge></Row>
                  )}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <p className="text-sm font-medium">Awaiting input</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Enter a plate and submit. The receipt or any block notice will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function QuickPick({
  label,
  hint,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  tone: "success" | "destructive";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <p className="font-mono text-sm font-medium tracking-wider">{label}</p>
      <p className={tone === "destructive" ? "text-[10px] text-destructive" : "text-[10px] text-success"}>{hint}</p>
    </button>
  );
}
