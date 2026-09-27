import React from "react";
import type { Metadata } from "next";
import { loadDashboardAnalysisData } from "@/lib/evaluation/analysis/dashboardLoader";
import { ResearchDashboardClient } from "@/components/research/ResearchDashboardClient";

export const metadata: Metadata = {
  title: "HomeMind Research — Baseline Comparison Dashboard",
  description:
    "Empirical baseline comparison of LAYA and local conventional LLM (llama3.2:3b) over the frozen 36-scenario benchmark dataset.",
};

export const dynamic = "force-dynamic";

export default function ResearchDashboardPage() {
  // Load and verify frozen analysis artifacts on the server
  const data = loadDashboardAnalysisData();

  return <ResearchDashboardClient data={data} />;
}
