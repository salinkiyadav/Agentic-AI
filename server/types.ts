// Shared types for DataSight AI Agent
export interface DatasetMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  totalRecords: number;
  injectedFlaws: {
    type: 'missing_values' | 'inconsistent_casing' | 'duplicate_records' | 'date_format_inconsistency' | 'outlier_values';
    description: string;
    affectedFields: string[];
    impact: string;
  }[];
}

export interface FieldProfile {
  name: string;
  type: string;
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  sampleValues: any[];
  min?: number | string;
  max?: number | string;
  casingVariations?: string[];
}

export interface DatasetSchema {
  datasetId: string;
  fields: Record<string, FieldProfile>;
  totalCount: number;
}

export interface ToolTrace {
  stepId: string;
  toolName: string;
  description: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED';
  input: any;
  output: any;
  reasoning: string;
}

export interface AgentExecutionState {
  currentState: 
    | 'IDLE' 
    | 'CLASSIFY_INTENT' 
    | 'INSPECT_SCHEMA' 
    | 'PROFILE_FIELDS' 
    | 'GENERATE_QUERY' 
    | 'VALIDATE_QUERY' 
    | 'EXECUTE_QUERY' 
    | 'CRITIQUE_RESULT' 
    | 'REFINEMENT_LOOP' 
    | 'SYNTHESIZE' 
    | 'COMPLETED' 
    | 'REJECTED';
  iteration: number;
  maxIterations: number;
  traces: ToolTrace[];
  isRejected: boolean;
  rejectionReason?: string;
  rejectionType?: 'DESTRUCTIVE' | 'AMBIGUOUS' | 'OUT_OF_SCOPE';
}

export interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'kpi' | 'table';
  title: string;
  xKey?: string;
  yKey?: string;
  series?: string[];
  kpiValue?: string | number;
  kpiLabel?: string;
  kpiSubtext?: string;
}

export interface AgentQueryResult {
  question: string;
  datasetId: string;
  success: boolean;
  status: 'COMPLETED' | 'REJECTED' | 'FAILED';
  answer: string;
  pipeline: any[];
  data: any[];
  chartConfig?: ChartConfig;
  assumptions: string[];
  limitations: string[];
  dataCleaningApplied: string[];
  executionStats: {
    totalDurationMs: number;
    docsExamined: number;
    docsReturned: number;
    iterationsUsed: number;
    model: string;
  };
  stateTrace: AgentExecutionState;
}

export interface BenchmarkItem {
  id: string;
  category: 'simple_filter' | 'grouping' | 'date_trend' | 'messy_casing' | 'null_handling' | 'ambiguity' | 'destructive' | 'out_of_scope';
  question: string;
  datasetId: string;
  expectedBehavior: 'EXECUTE' | 'REJECT_DESTRUCTIVE' | 'REJECT_OUT_OF_SCOPE' | 'CLARIFY_AMBIGUOUS';
  description: string;
  expectedInsight: string;
  baselinePromptFlaw: string;
}
