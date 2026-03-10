/**
 * Helper utilities for Prisma models
 * Converts Prisma's bigint types to JavaScript number types
 */

/**
 * Convert Prisma bigint timestamp fields to number
 * Prisma returns bigint for INTEGER columns, but our types expect number
 */
export function convertPrismaDates<T>(obj: any): T {
  if (!obj || typeof obj !== 'object') return obj;

  const converted = { ...obj };

  // Convert all bigint fields ending with _at to number
  for (const key in converted) {
    if (key.endsWith('_at') && typeof converted[key] === 'bigint') {
      converted[key] = Number(converted[key]);
    }
  }

  return converted as T;
}

/**
 * Convert an array of Prisma objects
 */
export function convertPrismaDatesArray<T>(arr: any[]): T[] {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => convertPrismaDates<T>(item));
}

/**
 * Convert or undefined for nullable results
 */
export function convertPrismaDatesOrNull<T>(obj: any): T | undefined {
  if (!obj) return undefined;
  return convertPrismaDates<T>(obj);
}
