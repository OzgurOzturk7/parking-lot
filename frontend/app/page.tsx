"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Lot, type LotZones } from "@/lib/api";
import { cn } from "@/lib/utils";

function statusFor(pct: number) {
  if (pct >= 90) return { label: "Almost full", tone: "text-destructive", bar: "bg-destructive" };
  if (pct >= 70) return { label: "Filling", tone: "text-warning", bar: "bg-warning" };
  return { label: "Open", tone: "text-success", bar: "bg-success" };
}

function ZoneRow({ zone }: { zone: LotZones["zones"][number] }) {
  const pct = Math.min(100, Math.round((zone.occupied / Math.max(1, zone.capacity)) * 100));
  const s = statusFor(pct);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {zone.name}
            <span className="ml-1 text-xs text-muted-foreground">· floor {zone.floor}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            ${parseFloat(zone.rate_plan.amount).toFixed(2)} per{" "}
            {zone.rate_plan.type === "per_hour" ? "hour" : "minute"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium tabular-nums">
            {zone.occupied}
            <span className="text-muted-foreground">/{zone.capacity}</span>
          </p>
          <p className={cn("text-xs font-medium", s.tone)}>{s.label}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", s.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotZones, setLotZones] = useState<Record<number, LotZones>>({});
  const [loaded, setLoaded] = useState(false);
  const [lastTick, setLastTick] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const ls = await api.lots();
        if (!mounted) return;
        setLots(ls);
        const zs = await Promise.all(ls.map((l) => api.lotZones(l.id)));
        if (!mounted) return;
        const map: Record<number, LotZones> = {};
        zs.forEach((z) => (map[z.lot_id] = z));
        setLotZones(map);
        setLoaded(true);
        setLastTick(new Date());
      } catch {}
    };
    load();
    const id = setInterval(load, 4000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const totals = useMemo(() => {
    const zones = Object.values(lotZones).flatMap((l) => l.zones);
    const capacity = zones.reduce((a, z) => a + z.capacity, 0);
    const occupied = zones.reduce((a, z) => a + z.occupied, 0);
    const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
    return { capacity, occupied, available: capacity - occupied, rate };
  }, [lotZones]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        {lastTick && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Updated {lastTick.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        <Stat label="Lots" value={lots.length} />
        <Stat label="Capacity" value={totals.capacity} />
        <Stat label="Occupied" value={totals.occupied} />
        <Stat label="Available" value={totals.available} accent />
      </div>

      {!loaded ? (
        <div className="rounded-lg border border-border bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse border-b border-border last:border-0" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {lots.map((lot) => {
            const lz = lotZones[lot.id];
            if (!lz) return null;
            const occ = lz.zones.reduce((a, z) => a + z.occupied, 0);
            const cap = lz.zones.reduce((a, z) => a + z.capacity, 0);
            return (
              <div key={lot.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">{lot.name}</h2>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {occ} / {cap} occupied
                  </p>
                </div>
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {lz.zones.map((z) => (
                    <ZoneRow key={z.id} zone={z} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight",
          accent && "text-primary"
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
