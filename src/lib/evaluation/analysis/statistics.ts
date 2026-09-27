import { DescriptiveStatistics } from "./types";

/**
 * Calculates arithmetic mean.
 */
export function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 10000) / 10000;
}

/**
 * Calculates median.
 */
export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10000) / 10000;
  }
  return Math.round(sorted[mid] * 10000) / 10000;
}

/**
 * Calculates sample standard deviation (N-1 degrees of freedom).
 */
export function computeStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10000) / 10000;
}

/**
 * Calculates percentile using linear interpolation between closest ranks.
 * @param values numerical sample
 * @param p percentile between 0 and 100 (e.g. 50 for median, 95 for P95)
 */
export function computePercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  const interpolated = sorted[lower] * (1 - weight) + sorted[upper] * weight;
  return Math.round(interpolated * 10000) / 10000;
}

/**
 * Computes complete descriptive statistics for an array of numbers.
 */
export function computeDescriptiveStatistics(
  values: number[],
  includePercentiles: boolean = false
): DescriptiveStatistics {
  if (values.length === 0) {
    const stats: DescriptiveStatistics = {
      count: 0,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      min: 0,
      max: 0,
    };
    if (includePercentiles) {
      stats.percentiles = { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }
    return stats;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const stats: DescriptiveStatistics = {
    count: values.length,
    mean: computeMean(values),
    median: computeMedian(values),
    standardDeviation: computeStandardDeviation(values),
    min: Math.round(min * 10000) / 10000,
    max: Math.round(max * 10000) / 10000,
  };

  if (includePercentiles) {
    stats.percentiles = {
      p50: computePercentile(values, 50),
      p75: computePercentile(values, 75),
      p90: computePercentile(values, 90),
      p95: computePercentile(values, 95),
      p99: computePercentile(values, 99),
    };
  }

  return stats;
}
