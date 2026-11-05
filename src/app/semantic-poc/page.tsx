"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { embedNeedlePair, type NeedleDownloadProgress } from "@/lib/matching/needle-browser";
import { prepareSemanticText } from "@/lib/matching/taxonomy";

export default function SemanticPocPage() {
  const [first, setFirst] = useState("Frontend developer experienced with React and Next.js");
  const [second, setSecond] = useState("Builds web applications with TypeScript, React, and modern frontend tools");
  const [progress, setProgress] = useState<NeedleDownloadProgress | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof embedNeedlePair>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runProof() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await embedNeedlePair(
        prepareSemanticText({ kind: "query", text: first }),
        prepareSemanticText({ kind: "query", text: second }),
        setProgress,
      ));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Needle embedding failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pt-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Needle 3 embedding proof of concept
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This loads the browser WASM runtime, embeds both texts, validates their vectors, and computes cosine similarity locally.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="needle-first">First text</Label>
            <Textarea id="needle-first" value={first} onChange={(event) => setFirst(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="needle-second">Second text</Label>
            <Textarea id="needle-second" value={second} onChange={(event) => setSecond(event.target.value)} />
          </div>
          <Button type="button" onClick={runProof} disabled={running}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? "Loading model and embedding..." : "Run embedding proof"}
          </Button>
          {progress && (
            <p className="text-xs text-muted-foreground">
              Model download: {progress.percentage !== undefined ? `${Math.round(progress.percentage)}%` : `${progress.loaded} bytes`}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p><strong>Model:</strong> {result.first.model}</p>
              <p><strong>Vector dimension:</strong> {result.first.dimension}</p>
              <p><strong>Vectors valid:</strong> yes; finite, non-zero, and same dimension</p>
              <p><strong>Cosine similarity:</strong> {result.similarity.toFixed(6)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
