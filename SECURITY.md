# Security Policy

VertigoDx is a clinical decision support (CDS) prototype. The MVP shipped
for the Gemma 4 Good Hackathon is **not a regulated medical device** and
must not be used in production clinical care without proper validation
and regulatory clearance. That said, we take security and clinical-safety
reporting seriously even at the MVP stage.

---

## Reporting a vulnerability

If you discover a security issue, **do not open a public GitHub issue**.
Instead, email the maintainer directly:

**[manuelpenazuniga@gmail.com](mailto:manuelpenazuniga@gmail.com)**

Please include:

- A description of the issue and the impact you believe it has.
- Steps to reproduce.
- The commit hash or version you tested against.
- Whether you would like to be credited in the fix's release notes.

We will acknowledge receipt within 72 hours and aim to provide a remediation
plan within 7 days for credible reports.

---

## In-scope concerns

We care about:

- **Patient data exposure.** The project runs 100% locally on purpose. Any code path that sends patient data to a remote service (including telemetry, error reporting, or model providers) is a critical bug.
- **Clinical-safety regressions.** If a change makes the rule engine, triage scoring, or LLM reasoning produce systematically less safe output (e.g., stops triggering stroke alerts when they should), that is in scope.
- **Prompt-injection vectors.** The questionnaire inputs are typed enums, but if someone finds a path to inject arbitrary text into the system prompt or RAG context, we want to know.
- **Dependency vulnerabilities.** Critical CVEs in our direct dependencies (`fastapi`, `pydantic`, `chromadb`, `ollama`, `next`, etc.).

## Out of scope

- **Performance issues** that don't have security implications.
- **Theoretical risks** that require an attacker to already have local code execution on the clinician's machine — in that scenario, the patient's data is already compromised by other means.
- **Social-engineering scenarios** against individual clinicians.

---

## Clinical-safety reporting

If you are a clinician who notices that VertigoDx produces unsafe or
clinically incorrect output for a real-world case, please open a
[GitHub issue](https://github.com/manuelpenazuniga/vertigoDx/issues)
with the label `clinical-safety`. Include the questionnaire responses
(anonymized) and the actual vs. expected output. Do **not** include any
patient identifiers.

---

## Disclosure process

For security issues we follow coordinated disclosure:

1. You report privately.
2. We confirm and develop a fix.
3. We release the fix with the vulnerability disclosed in the release notes, crediting you unless you prefer to remain anonymous.
4. Public disclosure happens at the same time as the fix release.

We do not currently offer monetary rewards, but we will credit you publicly and warmly.
