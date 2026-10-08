export interface ValidationResult {
  isValid: boolean;
  isDestructive: boolean;
  errors: string[];
  warnings: string[];
  sanitizedPipeline?: any[];
}

const ALLOWED_STAGES = new Set([
  '$match',
  '$group',
  '$sort',
  '$limit',
  '$project',
  '$skip',
  '$unwind',
  '$count',
  '$addFields',
  '$facet',
  '$bucket',
  '$sample',
  '$set',
  '$unset'
]);

const FORBIDDEN_STAGES = new Set([
  '$out',
  '$merge',
  '$currentOp',
  '$collStats',
  '$indexStats',
  '$planCacheStats',
  '$changeStream',
  '$listLocalSessions',
  '$listSessions'
]);

const FORBIDDEN_OPERATORS = new Set([
  '$where',
  '$function',
  '$accumulator'
]);

export function validateQueryPipeline(pipeline: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let isDestructive = false;

  if (!Array.isArray(pipeline)) {
    return {
      isValid: false,
      isDestructive: false,
      errors: ['Pipeline must be a JSON array of aggregation stages.'],
      warnings: []
    };
  }

  if (pipeline.length === 0) {
    return {
      isValid: false,
      isDestructive: false,
      errors: ['Pipeline cannot be empty.'],
      warnings: []
    };
  }

  // Deep check every stage and operator
  const sanitizedStages: any[] = [];

  for (let i = 0; i < pipeline.length; i++) {
    const stage = pipeline[i];
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      errors.push(`Stage #${i + 1} must be a valid JSON object.`);
      continue;
    }

    const keys = Object.keys(stage);
    if (keys.length === 0) {
      errors.push(`Stage #${i + 1} is an empty object.`);
      continue;
    }

    for (const key of keys) {
      if (FORBIDDEN_STAGES.has(key)) {
        isDestructive = true;
        errors.push(`Forbidden stage '${key}' detected at stage #${i + 1}. Write or system modification stages are strictly disallowed.`);
      } else if (!ALLOWED_STAGES.has(key)) {
        errors.push(`Disallowed stage '${key}' at stage #${i + 1}. Only read-only analytical stages are permitted.`);
      }

      // Check for forbidden operator keywords inside the stage value
      const stageStr = JSON.stringify(stage[key]);
      for (const forbiddenOp of FORBIDDEN_OPERATORS) {
        if (stageStr.includes(`"${forbiddenOp}"`)) {
          isDestructive = true;
          errors.push(`Forbidden operator '${forbiddenOp}' found in stage #${i + 1}. Arbitrary code execution is blocked.`);
        }
      }

      // Look for write intent keywords
      if (/(\bdrop\b|\bdelete\b|\bupdate\b|\binsert\b|\bremove\b)/i.test(key)) {
        isDestructive = true;
        errors.push(`Mutating operator '${key}' is prohibited in read-only mode.`);
      }
    }

    sanitizedStages.push(stage);
  }

  // Check stage count limits
  if (pipeline.length > 15) {
    warnings.push(`Pipeline contains ${pipeline.length} stages; complexity limit is recommended under 10 stages.`);
  }

  return {
    isValid: errors.length === 0,
    isDestructive,
    errors,
    warnings,
    sanitizedPipeline: errors.length === 0 ? sanitizedStages : undefined
  };
}
