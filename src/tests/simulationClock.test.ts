import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { HomeProvider } from "@/context/HomeContext";
import { SimulationClock } from "@/components/layout/SimulationClock";

describe("Milestone 3.13B.1 — Simulation Clock Hydration Fix", () => {
  it("should render deterministic '--:--:--' and '---' during server-side rendering (SSR)", () => {
    const element = React.createElement(
      HomeProvider,
      null,
      React.createElement(SimulationClock, null)
    );
    const html = renderToString(element);

    // Verify deterministic SSR placeholders
    expect(html).toContain("--:--:--");
    expect(html).toContain("---");
    expect(html).toContain("SIM 1x");
    expect(html).toContain("Sim Mode");

    // Verify no locale-dependent timestamp string leaked into initial SSR markup
    // Time regex for HH:MM:SS format
    const timeMatch = html.match(/\d{2}:\d{2}:\d{2}/);
    expect(timeMatch).toBeNull();
  });
});
