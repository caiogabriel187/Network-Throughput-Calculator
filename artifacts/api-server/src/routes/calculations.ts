import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { CreateCalculationBody } from "@workspace/api-zod";

type CalculationType = "throughput" | "link-budget";

interface Calculation {
  id: string;
  type: CalculationType;
  title: string;
  summary: string;
  notes?: string;
  createdAt: string;
}

// In-memory store. Simple persistence layer for this teaching project — data
// lives for the lifetime of the server process.
const calculations: Calculation[] = [
  {
    id: randomUUID(),
    type: "throughput",
    title: "FR1 100 MHz · 256-QAM",
    summary: "DL 1.75 Gbps · UL 625 Mbps · 273 PRB",
    notes: "4 camadas MIMO, TDD 75/25.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: randomUUID(),
    type: "link-budget",
    title: "Cobertura urbana 3.5 GHz",
    summary: "Raio 271.6 km · MAPL 152 dB · Sens. -100 dBm",
    notes: "Modelo de espaço livre (otimista).",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

function sorted(): Calculation[] {
  return [...calculations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

const router: IRouter = Router();

router.get("/calculations", (_req, res) => {
  res.json(sorted());
});

router.post("/calculations", (req, res) => {
  const parsed = CreateCalculationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }

  const { type, title, summary, notes } = parsed.data;

  // The generated schema only checks length before trimming, so reject
  // whitespace-only values to keep server validation in lockstep with the UI.
  const trimmedTitle = title.trim();
  const trimmedSummary = summary.trim();
  if (!trimmedTitle || !trimmedSummary) {
    res.status(400).json({
      title: "Dados inválidos",
      detail: "Título e resultado não podem ficar em branco.",
    });
    return;
  }

  const calculation: Calculation = {
    id: randomUUID(),
    type: type as CalculationType,
    title: trimmedTitle,
    summary: trimmedSummary,
    ...(notes && notes.trim() ? { notes: notes.trim() } : {}),
    createdAt: new Date().toISOString(),
  };

  calculations.push(calculation);
  res.status(201).json(calculation);
});

router.delete("/calculations/:id", (req, res) => {
  const index = calculations.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ title: "Cálculo não encontrado" });
    return;
  }

  calculations.splice(index, 1);
  res.status(204).end();
});

export default router;
