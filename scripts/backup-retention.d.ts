export interface RetentionOptions {
  maxFiles?: number;
  maxAgeDays?: number;
}

export interface RetentionResult {
  pruned: number;
  retained: number;
}

/**
 * تطبيق سياسة الاحتفاظ بالنسخ الاحتياطية
 * @param dir مجلد النسخ الاحتياطية
 * @param options خيارات الاحتفاظ
 */
export function applyRetentionPolicy(
  dir: string,
  options?: RetentionOptions,
): RetentionResult;
