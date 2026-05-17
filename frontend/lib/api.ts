// Typed wrappers around the backend HTTP API.
//
// All requests target localhost:8000 because the privacy invariant is that
// the entire stack runs on the clinician's machine. If at some point we add
// a public deploy, replace BASE_URL with process.env.NEXT_PUBLIC_API_URL —
// do NOT introduce a new dependency for this.

import type { DemoCase, DiagnosticResult, PatientResponsesPayload } from "./types";

const BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchHealthcheck(): Promise<{ offline: boolean }> {
  const res = await fetch(`${BASE_URL}/healthcheck`);
  if (!res.ok) throw new ApiError("Healthcheck failed", res.status);
  return res.json();
}

export async function fetchDemoCases(): Promise<DemoCase[]> {
  const res = await fetch(`${BASE_URL}/demo-cases`);
  if (!res.ok) throw new ApiError("Failed to load demo cases", res.status);
  return res.json();
}

export async function postDiagnose(
  payload: PatientResponsesPayload,
): Promise<DiagnosticResult> {
  const res = await fetch(`${BASE_URL}/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Diagnose failed: ${body || res.statusText}`, res.status);
  }
  return res.json();
}
