const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type RatePlan = {
  type: "per_minute" | "per_hour";
  amount: string;
  grace_minutes: number;
};

export type Lot = { id: number; name: string; address: string };

export type Zone = {
  id: number;
  name: string;
  floor: number;
  capacity: number;
  occupied: number;
  rate_plan: RatePlan;
};

export type LotZones = { lot_id: number; lot_name: string; zones: Zone[] };

export type Occupancy = {
  zone_id: number;
  capacity: number;
  occupied: number;
  available: number;
  as_of: string;
};

export type EntryResponse = {
  session_id: number;
  license_plate: string;
  spot: { id: number; code: string; zone_name: string };
  entry_time: string;
  rate_plan: RatePlan;
};

export type ExitResponse = {
  session_id: number;
  license_plate: string;
  entry_time: string;
  exit_time: string;
  duration_minutes: number;
  billed_units: number;
  rate_plan: RatePlan;
  total_fee: string;
  spot_code: string;
};

export type SessionRecord = {
  session_id: number;
  license_plate: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  billed_units: number | null;
  rate_plan: RatePlan;
  total_fee: string | null;
  spot_code: string;
};

export type FlaggedPlate = {
  license_plate: string;
  outstanding_balance: string;
  reason: string;
  flagged_at: string;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let code = "ERROR";
    let message = res.statusText;
    let details: Record<string, unknown> = {};
    try {
      const body = await res.json();
      const d = body.detail ?? body;
      if (typeof d === "object" && d !== null) {
        code = d.error ?? code;
        message = d.message ?? message;
        details = d;
      }
    } catch {}
    throw new ApiError(res.status, code, message, details);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  lots: () => request<Lot[]>("/lots"),
  lotZones: (lotId: number) => request<LotZones>(`/lots/${lotId}/zones`),
  occupancy: (zoneId: number) => request<Occupancy>(`/occupancy/${zoneId}`),
  entry: (license_plate: string, zone_id: number) =>
    request<EntryResponse>("/entry", { method: "POST", body: JSON.stringify({ license_plate, zone_id }) }),
  exit: (license_plate: string) =>
    request<ExitResponse>("/exit", { method: "POST", body: JSON.stringify({ license_plate }) }),
  session: (id: number) => request<SessionRecord>(`/sessions/${id}`),
  flaggedList: (minBalance = 0) =>
    request<FlaggedPlate[]>(`/admin/flagged-plates?min_balance=${minBalance}`),
  flaggedAdd: (data: { license_plate: string; outstanding_balance: number; reason: string }) =>
    request<FlaggedPlate>("/admin/flagged-plates", { method: "POST", body: JSON.stringify(data) }),
  flaggedDelete: (plate: string) =>
    request<void>(`/admin/flagged-plates/${plate}`, { method: "DELETE" }),
};
