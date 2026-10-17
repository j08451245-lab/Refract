// electron/services/reranking/rerankBudget.ts
//
// Rerank latency-budget fit reporter (unbuilt budget config). The call site
// (reranker probe handler) REPORTS the returned string alongside measured
// latency — it never gates on it. Without a configured budget the honest
// report is 'no-budget-configured', which is what this returns.

export function describeRerankLatencyFit(_requestLatencyMs: number): string {
  void _requestLatencyMs;
  return 'no-budget-configured';
}
