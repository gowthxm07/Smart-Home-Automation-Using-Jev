import fs from "fs";
import path from "path";
import { EvaluationScenario } from "../types";
import {
  ComparativeProviderEntry,
  ComparativeScenarioStatus,
  ControlledExperimentReport,
  ControlledScenarioRepetitionResult,
  ExperimentManifest,
  ExperimentManifestProviderInfo,
  ExperimentMode,
  PersistedExecutionRecord,
  ProviderDescriptiveAggregates,
  RepetitionObservation,
} from "./types";
import { sanitizeForSerialization } from "./serialization";
import { computeProviderAggregates } from "./experiment";

// =============================================================================
// Typed Persistence Errors
// =============================================================================

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceError";
  }
}

export class DuplicateExecutionError extends PersistenceError {
  constructor(public readonly executionId: string) {
    super(`Duplicate execution identity detected: '${executionId}' has already been persisted.`);
    this.name = "DuplicateExecutionError";
  }
}

export class IncompatibleExperimentError extends PersistenceError {
  constructor(message: string) {
    super(`Incompatible experiment configuration: ${message}`);
    this.name = "IncompatibleExperimentError";
  }
}

export class MalformedRecordError extends PersistenceError {
  constructor(message: string, public readonly rawLine?: string) {
    super(`Malformed persistence record: ${message}`);
    this.name = "MalformedRecordError";
  }
}

// =============================================================================
// Unique Execution Identity
// =============================================================================

/**
 * Builds a deterministic, unique execution identity.
 * Form: `${experimentId}:${scenarioId}:${repetition}:${providerId}`
 */
export function buildExecutionId(
  experimentId: string,
  scenarioId: string,
  repetition: number,
  providerId: string
): string {
  if (!experimentId || !scenarioId || !repetition || !providerId) {
    throw new PersistenceError(
      `Cannot construct executionId: missing component (experimentId=${experimentId}, scenarioId=${scenarioId}, rep=${repetition}, provider=${providerId})`
    );
  }
  return `${experimentId}:${scenarioId}:${repetition}:${providerId}`;
}

// =============================================================================
// Record & Observation Mappers
// =============================================================================

/**
 * Converts a RepetitionObservation and execution context into a fully hydrated PersistedExecutionRecord.
 */
export function observationToRecord(params: {
  experimentId: string;
  scenario: Readonly<EvaluationScenario>;
  repetition: number;
  provider: ComparativeProviderEntry;
  observation: RepetitionObservation;
  checkpoint?: string;
  repository?: string;
  device?: string;
  runtime?: string;
}): PersistedExecutionRecord {
  const { experimentId, scenario, repetition, provider, observation } = params;
  const executionId = buildExecutionId(experimentId, scenario.id, repetition, provider.providerId);
  const engineId = provider.engine.id || provider.providerId;

  const decisionMeta = (observation.decisionResult?.metadata as Record<string, unknown>) || {};
  const providerMeta = observation.providerMetadata || {};

  const checkpoint =
    params.checkpoint ||
    (decisionMeta.checkpoint as string) ||
    (providerMeta.checkpoint as string) ||
    (typeof (provider.engine as any).getModel === "function" ? (provider.engine as any).getModel() : undefined);

  const repository =
    params.repository ||
    (decisionMeta.repository as string) ||
    (providerMeta.repository as string);

  const device =
    params.device ||
    (decisionMeta.device as string) ||
    (providerMeta.device as string);

  const runtime =
    params.runtime ||
    (decisionMeta.runtime as string) ||
    (providerMeta.runtime as string);

  const rawAnswers = decisionMeta.rawAnswers ?? providerMeta.rawAnswers;
  const probabilities =
    decisionMeta.probabilities ??
    (rawAnswers as any)?.intent_family?.probabilities ??
    providerMeta.probabilities;

  const confidence = observation.decisionResult?.confidence;
  const modelReportedConfidence =
    typeof (rawAnswers as any)?.intent_family?.confidence === "number"
      ? (rawAnswers as any).intent_family.confidence
      : typeof (rawAnswers as any)?.intent_family?.answer_confidence === "number"
      ? (rawAnswers as any).intent_family.answer_confidence
      : confidence;

  return {
    executionId,
    experimentId,
    scenarioId: scenario.id,
    scenarioCategory: (scenario.metadata?.category as string) || "NORMAL",
    repetition,
    providerId: provider.providerId,
    engineId,
    status: observation.status,
    unsupportedReason: observation.unsupportedReason,
    checkpoint,
    repository,
    device,
    runtime,
    initialStateFingerprint: observation.initialStateFingerprint,
    intent: scenario.intent,
    rawAnswers,
    probabilities,
    modelReportedConfidence,
    confidence,
    proposedActions: observation.proposedActions,
    skippedRedundantActions: observation.skippedRedundantActions,
    executableActions: observation.executableActions,
    simulatedActions: observation.executableActions,
    simulationResult: observation.finalState ? { simulated: true } : undefined,
    simulationSuccess: observation.status === "SUPPORTED_SUCCESS",
    simulationErrors: observation.error ? [observation.error] : [],
    evaluationResult: observation.evaluationResult,
    timing: observation.timing,
    decisionLatencyMs: observation.timing?.decisionLatencyMs,
    simulationLatencyMs: observation.timing?.simulationLatencyMs,
    evaluationLatencyMs: observation.timing?.evaluationLatencyMs,
    totalLatencyMs: observation.timing?.totalExecutionLatencyMs,
    error: observation.error,
    errorPhase: observation.errorPhase,
    executedAt: observation.decisionResult?.timestamp || new Date().toISOString(),
  };
}

/**
 * Reconstructs a RepetitionObservation from a persisted record.
 */
export function recordToObservation(record: PersistedExecutionRecord): RepetitionObservation {
  return {
    repetition: record.repetition,
    providerId: record.providerId,
    engineId: record.engineId,
    status: record.status,
    unsupportedReason: record.unsupportedReason,
    initialStateFingerprint: record.initialStateFingerprint,
    decisionResult: record.intent
      ? {
          engineId: record.engineId,
          source: record.providerId as any,
          intent: record.intent,
          actions: record.executableActions as any,
          confidence: record.confidence ?? record.modelReportedConfidence,
          reasoning:
            (record.rawAnswers as any)?.reasoning ||
            `Reconstructed observation for ${record.providerId} (${record.executionId}).`,
          decisionTimeMs: record.decisionLatencyMs ?? record.timing?.decisionLatencyMs ?? 0,
          timestamp: record.executedAt,
          metadata: {
            checkpoint: record.checkpoint,
            repository: record.repository,
            rawAnswers: record.rawAnswers,
            probabilities: record.probabilities,
            proposedActions: record.proposedActions,
            skippedRedundantActions: record.skippedRedundantActions,
          },
        }
      : undefined,
    evaluationResult: record.evaluationResult,
    timing: record.timing || (record.totalLatencyMs !== undefined
      ? {
          decisionLatencyMs: record.decisionLatencyMs ?? 0,
          simulationLatencyMs: record.simulationLatencyMs ?? 0,
          evaluationLatencyMs: record.evaluationLatencyMs ?? 0,
          totalExecutionLatencyMs: record.totalLatencyMs ?? 0,
        }
      : undefined),
    executableActions: record.executableActions,
    proposedActions: record.proposedActions,
    skippedRedundantActions: record.skippedRedundantActions,
    providerMetadata: {
      checkpoint: record.checkpoint,
      repository: record.repository,
      device: record.device,
      runtime: record.runtime,
      rawAnswers: record.rawAnswers,
      probabilities: record.probabilities,
    },
    error: record.error,
    errorPhase: record.errorPhase,
  };
}

// =============================================================================
// Atomic JSONL File Operations
// =============================================================================

/**
 * Appends an execution record to runs.jsonl using synchronous fsync guarantees.
 * Guarantees physical durability before the function returns.
 */
export function appendExecutionRecordSync(filePath: string, record: PersistedExecutionRecord): void {
  const sanitized = sanitizeForSerialization(record);
  const line = JSON.stringify(sanitized) + "\n";

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fd = fs.openSync(filePath, "a");
  try {
    fs.writeSync(fd, line, null, "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Loads and validates execution records from runs.jsonl.
 * Throws on malformed JSON or duplicate execution IDs.
 */
export function loadExecutionRecordsSync(filePath: string): PersistedExecutionRecord[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const records: PersistedExecutionRecord[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx].trim();
    if (!rawLine) continue; // Skip blank lines

    let parsed: any;
    try {
      parsed = JSON.parse(rawLine);
    } catch (err: unknown) {
      throw new MalformedRecordError(`Failed to parse JSON at line ${idx + 1}: ${(err as Error)?.message}`, rawLine);
    }

    if (!parsed || typeof parsed !== "object" || !parsed.executionId || !parsed.scenarioId || !parsed.repetition) {
      throw new MalformedRecordError(`Record at line ${idx + 1} is missing mandatory execution identity fields.`, rawLine);
    }

    const rec = parsed as PersistedExecutionRecord;
    if (seenIds.has(rec.executionId)) {
      throw new DuplicateExecutionError(rec.executionId);
    }

    seenIds.add(rec.executionId);
    records.push(rec);
  }

  return records;
}

// =============================================================================
// Manifest Operations
// =============================================================================

export function saveManifestSync(manifestPath: string, manifest: ExperimentManifest): void {
  const dir = path.dirname(manifestPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sanitized = sanitizeForSerialization(manifest);
  const serialized = JSON.stringify(sanitized, null, 2);

  const fd = fs.openSync(manifestPath, "w");
  try {
    fs.writeSync(fd, serialized, null, "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function loadManifestSync(manifestPath: string): ExperimentManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new PersistenceError(`Manifest file not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, "utf-8");
  try {
    const parsed = JSON.parse(content);
    if (!parsed.experimentId || !parsed.datasetHash || !parsed.mode) {
      throw new PersistenceError(`Invalid manifest format: missing mandatory headers in ${manifestPath}`);
    }
    return parsed as ExperimentManifest;
  } catch (err: unknown) {
    if (err instanceof PersistenceError) throw err;
    throw new PersistenceError(`Failed to parse manifest JSON in ${manifestPath}: ${(err as Error)?.message}`);
  }
}

/**
 * Validates that an existing manifest is strictly compatible with the current execution context.
 */
export function validateManifestForResume(
  manifest: ExperimentManifest,
  expected: {
    datasetHash: string;
    datasetScenarioCount: number;
    mode: ExperimentMode;
    providerIds: string[];
    repetitions: number;
  }
): void {
  if (manifest.datasetHash !== expected.datasetHash) {
    throw new IncompatibleExperimentError(
      `Dataset hash mismatch! Manifest hash is "${manifest.datasetHash}", but current dataset hash is "${expected.datasetHash}". An experiment cannot be resumed across a modified dataset.`
    );
  }

  if (manifest.datasetScenarioCount !== expected.datasetScenarioCount) {
    throw new IncompatibleExperimentError(
      `Scenario count mismatch! Manifest has ${manifest.datasetScenarioCount} scenarios, but reference dataset has ${expected.datasetScenarioCount}.`
    );
  }

  if (manifest.mode !== expected.mode) {
    throw new IncompatibleExperimentError(
      `Experiment mode mismatch! Manifest mode is "${manifest.mode}", but requested mode is "${expected.mode}".`
    );
  }

  if (manifest.repetitions !== expected.repetitions) {
    throw new IncompatibleExperimentError(
      `Repetition count mismatch! Manifest configured ${manifest.repetitions} repetitions, but current run requested ${expected.repetitions}.`
    );
  }

  const manifestProviders = [...manifest.providerIds].sort().join(",");
  const expectedProviders = [...expected.providerIds].sort().join(",");
  if (manifestProviders !== expectedProviders) {
    throw new IncompatibleExperimentError(
      `Provider set mismatch! Manifest has [${manifestProviders}], but current run requested [${expectedProviders}].`
    );
  }
}

// =============================================================================
// ExperimentPersistenceManager
// =============================================================================

/**
 * High-level persistence manager handling directory layout, incremental writes,
 * atomic fsync guarantees, duplicate prevention, and state reconstruction.
 */
export class ExperimentPersistenceManager {
  readonly experimentDir: string;
  readonly manifestPath: string;
  readonly runsPath: string;
  readonly summaryPath: string;

  private manifest?: ExperimentManifest;
  private readonly completedRecords = new Map<string, PersistedExecutionRecord>();

  constructor(experimentDir: string) {
    this.experimentDir = experimentDir;
    this.manifestPath = path.join(experimentDir, "manifest.json");
    this.runsPath = path.join(experimentDir, "runs.jsonl");
    this.summaryPath = path.join(experimentDir, "summary.json");
  }

  exists(): boolean {
    return fs.existsSync(this.manifestPath);
  }

  getManifest(): ExperimentManifest | undefined {
    return this.manifest;
  }

  getCompletedCount(): number {
    return this.completedRecords.size;
  }

  getAllRecords(): PersistedExecutionRecord[] {
    return Array.from(this.completedRecords.values());
  }

  hasRecord(scenarioId: string, repetition: number, providerId: string): boolean {
    const key = `${scenarioId}:${repetition}:${providerId}`;
    return this.completedRecords.has(key);
  }

  getRecord(scenarioId: string, repetition: number, providerId: string): PersistedExecutionRecord | undefined {
    const key = `${scenarioId}:${repetition}:${providerId}`;
    return this.completedRecords.get(key);
  }

  /**
   * Initializes a brand-new experiment directory with manifest and empty runs.jsonl.
   */
  init(manifest: ExperimentManifest, overwrite = false): void {
    if (this.exists() && !overwrite) {
      throw new PersistenceError(
        `Experiment directory already exists with manifest at ${this.manifestPath}. Set resume: true or specify a unique experimentId.`
      );
    }

    if (!fs.existsSync(this.experimentDir)) {
      fs.mkdirSync(this.experimentDir, { recursive: true });
    }

    this.manifest = manifest;
    saveManifestSync(this.manifestPath, manifest);

    // Initialize or truncate runs.jsonl
    const fd = fs.openSync(this.runsPath, overwrite ? "w" : "a");
    fs.closeSync(fd);

    this.completedRecords.clear();
  }

  /**
   * Resumes an existing experiment, validating the manifest against current parameters
   * and indexing all completed records.
   */
  resume(expected: {
    datasetHash: string;
    datasetScenarioCount: number;
    mode: ExperimentMode;
    providerIds: string[];
    repetitions: number;
  }): { manifest: ExperimentManifest; completedCount: number } {
    const manifest = loadManifestSync(this.manifestPath);
    validateManifestForResume(manifest, expected);

    this.manifest = manifest;
    this.completedRecords.clear();

    const records = loadExecutionRecordsSync(this.runsPath);
    for (const rec of records) {
      const key = `${rec.scenarioId}:${rec.repetition}:${rec.providerId}`;
      if (this.completedRecords.has(key)) {
        throw new DuplicateExecutionError(rec.executionId);
      }
      this.completedRecords.set(key, rec);
    }

    return {
      manifest,
      completedCount: this.completedRecords.size,
    };
  }

  /**
   * Atomically appends a completed execution record and indexes it.
   * Throws DuplicateExecutionError if the record was already persisted.
   */
  appendRecord(record: PersistedExecutionRecord): void {
    const key = `${record.scenarioId}:${record.repetition}:${record.providerId}`;
    if (this.completedRecords.has(key)) {
      throw new DuplicateExecutionError(record.executionId);
    }

    appendExecutionRecordSync(this.runsPath, record);
    this.completedRecords.set(key, record);
  }

  /**
   * Updates manifest status to COMPLETED with completed timestamp.
   */
  markCompleted(): void {
    if (!this.manifest) {
      this.manifest = loadManifestSync(this.manifestPath);
    }
    this.manifest.status = "COMPLETED";
    this.manifest.completedAt = new Date().toISOString();
    saveManifestSync(this.manifestPath, this.manifest);
  }

  /**
   * Reconstructs a full ControlledExperimentReport from manifest and runs.jsonl.
   */
  reconstructReport(scenarios: readonly EvaluationScenario[]): ControlledExperimentReport {
    const manifest = this.manifest || loadManifestSync(this.manifestPath);
    const records = this.completedRecords.size > 0 ? this.getAllRecords() : loadExecutionRecordsSync(this.runsPath);

    // Group records by scenario
    const recordsByScenario = new Map<string, PersistedExecutionRecord[]>();
    for (const rec of records) {
      if (!recordsByScenario.has(rec.scenarioId)) {
        recordsByScenario.set(rec.scenarioId, []);
      }
      recordsByScenario.get(rec.scenarioId)!.push(rec);
    }

    const scenarioResults: ControlledScenarioRepetitionResult[] = [];

    for (const scenario of scenarios) {
      const scenarioRecords = recordsByScenario.get(scenario.id) || [];
      const repMap = new Map<number, RepetitionObservation[]>();

      for (const rec of scenarioRecords) {
        if (!repMap.has(rec.repetition)) {
          repMap.set(rec.repetition, []);
        }
        repMap.get(rec.repetition)!.push(recordToObservation(rec));
      }

      const repetitions: Array<{ repetition: number; providers: RepetitionObservation[] }> = [];
      const repKeys = Array.from(repMap.keys()).sort((a, b) => a - b);
      for (const rep of repKeys) {
        repetitions.push({
          repetition: rep,
          providers: repMap.get(rep)!,
        });
      }

      scenarioResults.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        category: (scenario.metadata?.category as string) || "NORMAL",
        intent: scenario.intent,
        initialStateFingerprint: scenarioRecords[0]?.initialStateFingerprint || "",
        repetitions,
      });
    }

    const aggregates: ProviderDescriptiveAggregates[] = manifest.providerIds.map((providerId) => {
      const pInfo = manifest.providers.find((p) => p.providerId === providerId);
      const engineId = pInfo?.engineId || providerId;
      return computeProviderAggregates(providerId, engineId, scenarios, scenarioResults);
    });

    const report: ControlledExperimentReport = {
      experimentId: manifest.experimentId,
      generatedAt: new Date().toISOString(),
      mode: manifest.mode,
      protocol: {
        mode: manifest.mode,
        datasetVersion: manifest.datasetVersion,
        datasetScenarioCount: manifest.datasetScenarioCount,
        datasetHash: manifest.datasetHash,
        repetitions: manifest.repetitions,
        providerIds: manifest.providerIds,
        executionOrder: `DETERMINISTIC_SEQUENTIAL_BY_SCENARIO (${manifest.providerIds.join(", ")})`,
        gitCommitHash: manifest.gitCommitHash,
        startedAt: manifest.startedAt,
        timeoutConfiguration: {
          perScenarioTimeoutMs: 45000,
        },
      },
      scenarioResults,
      aggregates,
    };

    return report;
  }

  /**
   * Reconstructs and writes summary.json to the experiment directory.
   */
  saveSummary(report: ControlledExperimentReport): string {
    const sanitized = sanitizeForSerialization(report);
    const serialized = JSON.stringify(sanitized, null, 2);

    const fd = fs.openSync(this.summaryPath, "w");
    try {
      fs.writeSync(fd, serialized, null, "utf-8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    return this.summaryPath;
  }
}

/**
 * Convenience function to reconstruct a full experiment report directly from an experiment directory.
 */
export function reconstructExperimentReport(
  experimentDir: string,
  scenarios: readonly EvaluationScenario[]
): ControlledExperimentReport {
  const manager = new ExperimentPersistenceManager(experimentDir);
  return manager.reconstructReport(scenarios);
}

/**
 * Scans a base directory for the most recently modified incomplete experiment directory.
 */
export function findLatestIncompleteExperiment(
  baseDir: string,
  mode?: ExperimentMode
): { experimentId: string; dir: string; manifest: ExperimentManifest } | undefined {
  if (!fs.existsSync(baseDir)) return undefined;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const candidates: Array<{ experimentId: string; dir: string; manifest: ExperimentManifest; mtime: number }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const expDir = path.join(baseDir, entry.name);
      const manifestPath = path.join(expDir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ExperimentManifest;
          if (manifest.status === "IN_PROGRESS" && (!mode || manifest.mode === mode)) {
            const stat = fs.statSync(manifestPath);
            candidates.push({ experimentId: manifest.experimentId, dir: expDir, manifest, mtime: stat.mtimeMs });
          }
        } catch {
          // ignore corrupted or unreadable directories
        }
      }
    }
  }

  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0];
}

