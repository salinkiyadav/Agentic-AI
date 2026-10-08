import { DatasetSchema, FieldProfile } from './types.ts';

export function inspectDatasetSchema(datasetId: string, documents: any[]): DatasetSchema {
  const totalCount = documents.length;
  const fieldsMap: Record<string, {
    types: Set<string>;
    nullCount: number;
    distinctValues: Set<any>;
    numericValues: number[];
    casingVariants: Map<string, Set<string>>;
  }> = {};

  for (const doc of documents) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldsMap[key]) {
        fieldsMap[key] = {
          types: new Set(),
          nullCount: 0,
          distinctValues: new Set(),
          numericValues: [],
          casingVariants: new Map(),
        };
      }

      const fieldData = fieldsMap[key];

      if (value === null || value === undefined || value === '') {
        fieldData.nullCount++;
        continue;
      }

      const valType = typeof value;
      fieldData.types.add(valType);

      if (fieldData.distinctValues.size < 50) {
        fieldData.distinctValues.add(value);
      }

      if (typeof value === 'number') {
        fieldData.numericValues.push(value);
      }

      if (typeof value === 'string') {
        const lower = value.trim().toLowerCase();
        if (!fieldData.casingVariants.has(lower)) {
          fieldData.casingVariants.set(lower, new Set());
        }
        fieldData.casingVariants.get(lower)!.add(value.trim());
      }
    }
  }

  const fields: Record<string, FieldProfile> = {};

  for (const [fieldName, data] of Object.entries(fieldsMap)) {
    const nullPercentage = totalCount > 0 ? Number(((data.nullCount / totalCount) * 100).toFixed(1)) : 0;
    const typeStr = Array.from(data.types).join(' | ') || 'unknown';
    
    // Find casing variants with more than 1 representation
    const mixedCasing: string[] = [];
    for (const [lower, rawSet] of data.casingVariants.entries()) {
      if (rawSet.size > 1) {
        mixedCasing.push(...Array.from(rawSet));
      }
    }

    let min: number | undefined;
    let max: number | undefined;
    if (data.numericValues.length > 0) {
      min = Math.min(...data.numericValues);
      max = Math.max(...data.numericValues);
    }

    fields[fieldName] = {
      name: fieldName,
      type: typeStr,
      nullCount: data.nullCount,
      nullPercentage,
      distinctCount: data.distinctValues.size,
      sampleValues: Array.from(data.distinctValues).slice(0, 8),
      min,
      max,
      casingVariations: mixedCasing.length > 0 ? mixedCasing : undefined
    };
  }

  return {
    datasetId,
    fields,
    totalCount
  };
}

export function profileSpecificFields(
  documents: any[],
  targetFields: string[]
): Record<string, any> {
  const profile: Record<string, any> = {};

  for (const field of targetFields) {
    const values = documents.map(d => d[field]).filter(v => v !== null && v !== undefined && v !== '');
    const countsMap = new Map<string, number>();

    for (const v of values) {
      const strVal = String(v);
      countsMap.set(strVal, (countsMap.get(strVal) || 0) + 1);
    }

    // Top 10 frequencies
    const topValues = Array.from(countsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([val, freq]) => ({ val, count: freq }));

    profile[field] = {
      totalNonEmpty: values.length,
      distinctCount: countsMap.size,
      topValues,
      sampleTypes: Array.from(new Set(values.slice(0, 20).map(v => typeof v)))
    };
  }

  return profile;
}
