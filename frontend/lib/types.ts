// Shared TypeScript mirror of the backend Pydantic models in
// backend/app/schemas.py. Keep this file in sync if the backend schema
// changes — currently it is the contract for /diagnose and /demo-cases.

export type Confidence = "alta" | "media" | "baja";

export type Urgency = "inmediata" | "alta" | "baja";

export type DiagnosisCandidate = {
  diagnosis: string;
  confidence: Confidence;
  supporting_criteria: string[];
  missing_criteria: string[];
  icvd_reference?: string | null;
};

export type StrokeAlert = {
  triggered: boolean;
  reason: string;
  urgency: Urgency;
  score_hints?: number | null;
  score_standing?: string | null;
};

export type DiagnosticResult = {
  differential: DiagnosisCandidate[];
  stroke_alert: StrokeAlert;
  clinical_reasoning: string;
  next_steps: string[];
  limitations: string;
  processing_time_ms?: number | null;
};

// Payload shape for POST /diagnose (mirrors PatientResponses in schemas.py).
// Keeping it loose (Record<string, unknown>) because the wizard accumulates
// it incrementally and validation happens server-side via Pydantic.
export type PatientResponsesPayload = Record<string, unknown>;

// Shape returned by GET /demo-cases.
export type DemoCase = {
  id: string;
  label: string;
  narrative: string;
  responses: PatientResponsesPayload;
  expected_top?: string;
  expected_top_options?: string[];
  expected_stroke_alert?: boolean;
  expected_urgency?: Urgency;
  note?: string;
};
