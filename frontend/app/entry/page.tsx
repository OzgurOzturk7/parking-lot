"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, type Lot, type LotZones, type EntryResponse } from "@/lib/api";
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Vehicle entry</h1>

      <div className="space-y-2">
        <Label htmlFor="plate">License plate</Label>
        <Input
          id="plate"
          placeholder="34ABC123"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && zoneId && submit()}
          className="h-10 font-mono uppercase"
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label>Zone</Label>
        <select
          value={zoneId ?? ""}
          onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : null)}
          className="block h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Pick a zone...</option>
          {lots.map((lot) => (
            <optgroup key={lot.id} label={lot.name}>
              {zonesByLot[lot.id]?.zones.map((z) => {
                const free = z.capacity - z.occupied;
                return (
                  <option key={z.id} value={z.id} disabled={free <= 0}>
                    {z.name} (floor {z.floor}) — {free}/{z.capacity} free — ${parseFloat(z.rate_plan.amount).toFixed(2)}/
                    {z.rate_plan.type === "per_hour" ? "h" : "min"}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      </div>

      <Button className="w-full h-10" disabled={submitting || !plate || !zoneId} onClick={submit}>
        {submitting ? "Opening..." : "Open session"}
      </Button>

      {result && (
        <div className={cn("rounded-lg border border-success/40 bg-success/5 p-5")}>
          <p className="text-xs text-success font-medium">Session opened · #{result.session_id}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{result.spot.code}</p>
          <Badge variant="secondary" className="mt-1">{result.spot.zone_name}</Badge>
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row label="Plate"><span className="font-mono">{result.license_plate}</span></Row>
            <Row label="Entry">{formatDateTime(result.entry_time)}</Row>
            <Row label="Rate">
              ${parseFloat(result.rate_plan.amount).toFixed(2)} per{" "}
              {result.rate_plan.type === "per_hour" ? "hour" : "minute"}
              {result.rate_plan.grace_minutes > 0 && (
                <span className="text-muted-foreground"> · {result.rate_plan.grace_minutes} min free</span>
              )}
            </Row>
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
