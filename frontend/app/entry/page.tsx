"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { api, ApiError, type Lot, type LotZones, type EntryResponse } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";

export default function EntryPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [zonesByLot, setZonesByLot] = useState<Record<number, LotZones>>({});
  const [plate, setPlate] = useState("");
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EntryResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const ls = await api.lots();
      setLots(ls);
      const zs = await Promise.all(ls.map((l) => api.lotZones(l.id)));
      const map: Record<number, LotZones> = {};
      zs.forEach((z) => (map[z.lot_id] = z));
      setZonesByLot(map);
    };
    load();
  }, []);

  const submit = async () => {
    if (!plate || !zoneId) {
      toast.warning("Enter a plate and pick a zone");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.entry(plate.trim().toUpperCase(), zoneId);
      setResult(r);
      toast.success(`Spot ${r.spot.code} assigned`);
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || "Could not open session", { description: err.code });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPlate("");
    setZoneId(null);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicle entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a zone and register the plate. The system picks the next available spot automatically.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="plate" className="text-sm text-foreground">License plate</Label>
              <Input
                id="plate"
                placeholder="34ABC123"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && zoneId && submit()}
                className="h-11 font-mono uppercase tracking-widest"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Zone</Label>
              <div className="divide-y divide-border rounded-md border border-border bg-card max-h-[420px] overflow-y-auto scrollbar-thin">
                {lots.map((lot) => (
                  <div key={lot.id}>
                    <div className="bg-muted/40 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground sticky top-0">
                      {lot.name}
                    </div>
                    {zonesByLot[lot.id]?.zones.map((z) => {
                      const free = z.capacity - z.occupied;
                      const full = free <= 0;
                      const selected = zoneId === z.id;
                      const pct = Math.min(100, Math.round((z.occupied / Math.max(1, z.capacity)) * 100));
                      return (
                        <button
                          key={z.id}
                          type="button"
                          disabled={full}
                          onClick={() => setZoneId(z.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-4 px-3.5 py-3 text-left transition-colors",
                            full
                              ? "opacity-50 cursor-not-allowed"
                              : selected
                                ? "bg-primary/8"
                                : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full border",
                                selected ? "border-primary bg-primary" : "border-border-strong"
                              )}
                            >
                              {selected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{z.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Floor {z.floor} · ${parseFloat(z.rate_plan.amount).toFixed(2)}/
                                {z.rate_plan.type === "per_hour" ? "h" : "min"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20">
                              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full",
                                    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-success"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                            <p className="text-sm font-medium tabular-nums w-14 text-right">
                              {free}
                              <span className="text-xs text-muted-foreground">/{z.capacity}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={submitting || !plate || !zoneId}
                onClick={submit}
              >
                {submitting ? "Opening..." : "Open session"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" onClick={reset} aria-label="Reset">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {result ? (
            <Card>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Session opened</p>
                    <p className="text-xs text-muted-foreground">#{result.session_id}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-xs text-muted-foreground">Assigned spot</p>
                  <p className="mt-1 text-4xl font-semibold font-mono tracking-tight">{result.spot.code}</p>
                  <Badge variant="secondary" className="mt-2">{result.spot.zone_name}</Badge>
                </div>

                <dl className="space-y-2.5 text-sm">
                  <Row label="Plate"><span className="font-mono">{result.license_plate}</span></Row>
                  <Row label="Entry">{formatDateTime(result.entry_time)}</Row>
                  <Row label="Rate">
                    ${parseFloat(result.rate_plan.amount).toFixed(2)} /{" "}
                    {result.rate_plan.type === "per_hour" ? "hour" : "minute"}
                  </Row>
                  {result.rate_plan.grace_minutes > 0 && (
                    <Row label="Grace"><Badge variant="success">{result.rate_plan.grace_minutes} min free</Badge></Row>
                  )}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <p className="text-sm font-medium">No assignment yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Fill the plate, pick a zone, and submit. The assigned spot will appear here.
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
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
