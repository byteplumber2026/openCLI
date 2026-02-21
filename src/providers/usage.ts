import { estimateCost } from "./tokens.js";

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
}

export class UsageTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private cost = 0;
  private requests = 0;

  track(inputTokens: number, outputTokens: number, model: string): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.cost += estimateCost(inputTokens, outputTokens, model);
    this.requests++;
  }

  getStats(): UsageStats {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      estimatedCost: this.cost,
      requestCount: this.requests,
    };
  }

  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.cost = 0;
    this.requests = 0;
  }
}
