"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError, auth, type FlaggedPlate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<FlaggedPlate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const [plate, setPlate] = useState("");
  const [balance, setBalance] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.flaggedList();
      setRows(r);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 401) {
        router.replace("/admin/login");
        return;
      }
      toast.error("Could not load flagged plates");
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    auth.clear();
    toast.success("Signed out");
    router.replace("/admin/login");
  };

  useEffect(() => {
    if (!auth.get()) {
      router.replace("/admin/login");
      return;
    }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  if (!authed) return null;

  const addFlag = async () => {
    const bal = parseFloat(balance);
    if (!plate.trim() || !reason.trim() || Number.isNaN(bal) || bal <= 0) {
      toast.warning("Check the form", {
        description: "Plate, reason and a balance greater than 0 are required.",
      });
      return;
    }
    try {
      await api.flaggedAdd({
        license_plate: plate.trim().toUpperCase(),
        outstanding_balance: bal,
        reason: reason.trim(),
      });
      toast.success("Plate flagged");
      setPlate("");
      setBalance("");
      setReason("");
      setOpen(false);
      load();
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || "Could not add flag", { description: err.code });
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Flagged plates</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add flag</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Flag a plate</DialogTitle>
                <DialogDescription>
                  The plate will be blocked at exit until the balance is cleared.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p">License plate</Label>
                  <Input id="p" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="34ABC123" className="font-mono uppercase" />
                  <p className="text-xs text-muted-foreground">2 to 10 letters or digits.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="b">Outstanding balance (USD)</Label>
                  <Input id="b" type="number" step="0.01" min="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="47.50" />
                  <p className="text-xs text-muted-foreground">Must be greater than 0.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r">Reason</Label>
                  <Input id="r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="card declined on session 142" />
                  <p className="text-xs text-muted-foreground">At least 3 characters.</p>
                </div>
                <Button className="w-full" onClick={addFlag}>Flag plate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
        <Stat label="Plates" value={String(rows.length)} />
        <Stat label="Outstanding" value={formatCurrency(totalDebt)} accent />
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search plate..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Plate</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Flagged at</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No plates.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.license_plate} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono font-medium">{r.license_plate}</td>
                    <td className="px-4 py-2 text-destructive tabular-nums">{formatCurrency(r.outstanding_balance)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.reason}</td>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums text-xs">{formatDateTime(r.flagged_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => removeFlag(r.license_plate)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading && rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No plates.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.license_plate} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono font-semibold">{r.license_plate}</p>
                <p className="text-destructive font-medium tabular-nums">{formatCurrency(r.outstanding_balance)}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">{formatDateTime(r.flagged_at)}</span>
                <button
                  onClick={() => removeFlag(r.license_plate)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums tracking-tight ${accent ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
