"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { OfflineBadge } from "@/components/OfflineBadge";
import { ResultPanel } from "@/components/ResultPanel";

type DemoCase = {
  id: string;
  label: string;
  narrative: string;
  responses: Record<string, unknown>;
  expected_stroke_alert?: boolean;
};

export default function DemoPage() {
  const [cases, setCases] = useState<DemoCase[]>([]);
  const [result, setResult] = useState<unknown | null>(null);
  const [selectedCase, setSelectedCase] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/demo-cases")
      .then((r) => r.json())
      .then((data: DemoCase[]) => setCases(data))
      .catch((err) => {
        console.error("Failed to load demo cases:", err);
      });
  }, []);

  async function runCase(c: DemoCase) {
    setLoading(true);
    setSelectedCase(c);
    try {
      const res = await fetch("http://localhost:8000/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.responses),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Error al procesar el caso. Verifica que el backend esté corriendo.");
      setSelectedCase(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSelectedCase(null);
  }

  if (result && selectedCase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typed = result as any;
    return (
      <>
        <OfflineBadge />
        <div className="bg-slate-100 dark:bg-slate-900 py-3 px-4 text-center text-sm">
          Caso demo: <strong>{selectedCase.label}</strong> · {selectedCase.narrative}
        </div>
        <ResultPanel result={typed} onRestart={reset} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
      <OfflineBadge />
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Casos demo</h1>
          <p className="text-muted-foreground">
            5 casos clínicos guionizados que muestran las capacidades de VertigoDx
            en BPPV, Ménière, migraña vestibular, sospecha de stroke y comorbilidad.
          </p>
        </div>

        {loading && (
          <Card className="p-8 text-center">
            <p className="font-medium">Procesando con Gemma 4...</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aplicando criterios ICVD · Calculando triaje · Generando razonamiento
            </p>
          </Card>
        )}

        {!loading &&
          cases.map((c) => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{c.label}</h3>
                    {c.expected_stroke_alert && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Alerta de causa central
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.narrative}</p>
                </div>
                <Button onClick={() => runCase(c)} disabled={loading}>
                  Ejecutar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}

        <div className="text-center pt-4">
          <Link href="/diagnose">
            <Button variant="outline">O ingresa un caso nuevo manualmente</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
