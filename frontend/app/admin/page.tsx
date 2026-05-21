"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { api, ApiError, type FlaggedPlate } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminPage() {
  const [rows, setRows] = useState<FlaggedPlate[]>([]);
  const [loading, setLoading] = useState(true);
  const [minBalance, setMinBalance] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const [plate, setPlate] = useState("");
  const [balance, setBalance] = useState("");
  const [reason, setReason] = useState("");

  const load = async (min = minBalance) => {
    setLoading(true);
    try {
      const r = await api.flaggedList(min);
      setRows(r);
    } catch {
      toast.error("Could not load flagged plates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(minBalance);
  }, [minBalance]);

  const addFlag = async () => {
    if (!plate || !balance || !reason) {
      toast.warning("All fields are required");
      return;
    }
    try {
      await api.flaggedAdd({
        license_plate: plate.trim().toUpperCase(),
        outstanding_balance: parseFloat(balance),
        reason,
      });
      toast.success("Plate flagged");
      setPlate("");
      setBalance("");
      setReason("");
      setOpen(false);
      load();
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || "Could not add flag");
    }
  };

  const removeFlag = async (p: string) => {
    try {
      await api.flaggedDelete(p);
      toast.success(`${p} cleared`);
      load();
    } catch {
      toast.error("Could not remove flag");
    }
  };

  const totalDebt = rows.reduce((a, r) => a + parseFloat(r.outstanding_balance), 0);
  const filtered = rows.filter((r) =>
    search === "" || r.license_plate.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flagged plates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These plates are blocked at exit until the outstanding balance is cleared.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-3.5 w-3.5" /> Add flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag a plate</DialogTitle>
              <DialogDescription>
                Adds the plate to the unpaid registry. Any exit request will return 403 until removed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="p">License plate</Label>
                <Input id="p" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="34ABC123" className="font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b">Outstanding balance (USD)</Label>
                <Input id="b" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="47.50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r">Reason</Label>
                <Input id="r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="card declined on session 142" />
              </div>
              <Button className="w-full" onClick={addFlag}>Flag plate</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <section className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Flagged plates" value={String(rows.length)} />
          <Stat label="Total outstanding" value={formatCurrency(totalDebt)} accent="text-destructive" />
          <div className="px-5 py-4 space-y-1">
            <Label htmlFor="min" className="text-xs text-muted-foreground">Min balance filter</Label>
            <div className="flex items-center gap-2">
              <Input
                id="min"
                type="number"
                min="0"
                step="5"
                value={minBalance}
                onChange={(e) => setMinBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-8 w-24"
              />
              <span className="text-xs text-muted-foreground">USD</span>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "plate" : "plates"}
          </p>
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-2.5 font-medium">Plate</th>
                  <th className="px-5 py-2.5 font-medium">Balance</th>
                  <th className="px-5 py-2.5 font-medium">Reason</th>
                  <th className="px-5 py-2.5 font-medium">Flagged at</th>
                  <th className="px-5 py-2.5 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`s-${i}`} className="border-b border-border last:border-0">
                      <td colSpan={5} className="p-4">
                        <div className="h-5 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No plates match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.license_plate} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-2.5">
                        <span className="font-mono font-medium tracking-wider">{r.license_plate}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge variant="destructive">{formatCurrency(r.outstanding_balance)}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground">{r.reason}</td>
                      <td className="px-5 py-2.5 text-muted-foreground tabular-nums">{formatDateTime(r.flagged_at)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFlag(r.license_plate)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Clear
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
