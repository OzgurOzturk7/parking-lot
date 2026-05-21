"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CircleParking, ShieldAlert, Zap } from "lucide-react";
import { api, type Lot, type LotZones, type FlaggedPlate } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stat = {
  label: string;
  value: number;
  hint: string;
  icon: React.ElementType;
  href?: string;
};

function StatCell({ stat }: { stat: Stat }) {
  const inner = (
    <div className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {stat.value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{stat.hint}</p>
      </div>
      <div className="rounded-md border border-border bg-card p-1.5 text-muted-foreground group-hover:text-foreground">
        <stat.icon className="h-3.5 w-3.5" />
      </div>
    </div>
  );
  return stat.href ? <Link href={stat.href}>{inner}</Link> : inner;
}

function statusFor(pct: number) {
  if (pct >= 90) return { label: "Almost full", tone: "text-destructive", bar: "bg-destructive" };
  if (pct >= 70) return { label: "Filling", tone: "text-warning", bar: "bg-warning" };
  return { label: "Open", tone: "text-success", bar: "bg-success" };
}

function ZoneRow({ zone, lotName }: { zone: LotZones["zones"][number]; lotName: string }) {
  const pct = Math.min(100, Math.round((zone.occupied / Math.max(1, zone.capacity)) * 100));
  const s = statusFor(pct);
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{zone.name}</p>
          <Badge variant="secondary" className="text-[10px]">Floor {zone.floor}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {lotName} · ${parseFloat(zone.rate_plan.amount).toFixed(2)}/
          {zone.rate_plan.type === "per_hour" ? "h" : "min"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-32">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", s.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
        </div>
        <p className="text-right text-sm font-semibold tabular-nums w-16">
          {zone.occupied}
          <span className="text-muted-foreground font-normal">/{zone.capacity}</span>
        </p>
      </div>

      <span className={cn("text-xs font-medium tabular-nums w-20 text-right", s.tone)}>{s.label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotZones, setLotZones] = useState<Record<number, LotZones>>({});
  const [flagged, setFlagged] = useState<FlaggedPlate[]>([]);
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
        const fl = await api.flaggedList();
        if (!mounted) return;
        setFlagged(fl);
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
    return { capacity, occupied, zones: zones.length };
  }, [lotZones]);

  const stats: Stat[] = [
    { label: "Parking lots", value: lots.length, hint: `${totals.zones} zones across all lots`, icon: Building2 },
    { label: "Total capacity", value: totals.capacity, hint: "spots across all zones", icon: CircleParking },
    { label: "Currently parked", value: totals.occupied, hint: `${totals.capacity - totals.occupied} available now`, icon: Zap },
    { label: "Flagged plates", value: flagged.length, hint: "blocked at exit", icon: ShieldAlert, href: "/admin" },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live occupancy across every lot. Counts come from Redis, source of truth is Postgres.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastTick && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success/40 dot-pulse" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Updated {lastTick.toLocaleTimeString()}
            </div>
          )}
          <Button asChild size="sm">
            <Link href="/entry">
              Open entry kiosk <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
          {stats.map((s) => (
            <StatCell key={s.label} stat={s} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {!loaded ? (
          <div className="rounded-lg border border-border bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-border last:border-0 animate-pulse" />
            ))}
          </div>
        ) : (
          lots.map((lot) => {
            const lz = lotZones[lot.id];
            if (!lz) return null;
            return (
              <div key={lot.id} className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">{lot.name}</h2>
                    <p className="text-xs text-muted-foreground">{lot.address}</p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {lz.zones.reduce((a, z) => a + z.occupied, 0)} /{" "}
                    {lz.zones.reduce((a, z) => a + z.capacity, 0)} occupied
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card divide-y divide-border">
                  {lz.zones.map((z) => (
                    <ZoneRow key={z.id} zone={z} lotName={lot.name} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
