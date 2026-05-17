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

/** Stage names emitted by the backend in order. */
export type PipelineStage =
  | "rules"
  | "triage"
  | "rag"
  | "model_loading"
  | "reasoning"
  | "complete";

export type StageEvent = {
  stage: PipelineStage;
  payload: Record<string, unknown>;
};

/** Stream the /diagnose/stream SSE endpoint, calling onStage for every event.
 *  Resolves with the final DiagnosticResult once the "reasoning" stage arrives.
 *  Throws ApiError if the stream ends without delivering a reasoning event.
 */
export async function streamDiagnose(
  payload: PatientResponsesPayload,
  onStage: (event: StageEvent) => void,
): Promise<DiagnosticResult> {
  const res = await fetch(`${BASE_URL}/diagnose/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Stream failed: ${body || res.statusText}`, res.status);
  }
  if (!res.body) throw new ApiError("Stream has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DiagnosticResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line ("\n\n").
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      if (!frame.startsWith("data: ")) continue;
      const json = frame.slice(6);
      let parsed: StageEvent;
      try {
        parsed = JSON.parse(json) as StageEvent;
      } catch {
        continue; // skip malformed frames defensively
      }
      onStage(parsed);
      if (parsed.stage === "reasoning") {
        result = parsed.payload as unknown as DiagnosticResult;
      }
    }
  }

  if (!result) throw new ApiError("Stream ended without reasoning event");
  return result;
}
