/**
 * PrintCost Formatting Utilities
 */

/**
 * Format a raw number to Vietnamese Dong currency display format
 * e.g., 250000 => "250.000 đ"
 */
export function formatVND(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0 đ';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse input currency string robustly to integer, stripping all non-digits
 * e.g., "250.000 đ" => 250000
 */
export function parseVNDInteger(str: string): number {
  if (!str) return 0;
  const cleanStr = str.replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

/**
 * Parse input percentage/coefficient string to float, preserving the decimal dot
 * e.g., "1.10" => 1.1, "40.5%" => 40.5
 */
export function parseFloatDecimal(str: string): number {
  if (!str) return 0;
  
  // Clean anything except digits and dot
  const cleanStr = str.replace(/[^0-9.]/g, '');
  
  // Ensure we only keep the first dot if multiple dots exist
  const dotIndex = cleanStr.indexOf('.');
  if (dotIndex !== -1) {
    const beforeDot = cleanStr.substring(0, dotIndex);
    const afterDot = cleanStr.substring(dotIndex + 1).replace(/\./g, '');
    const joined = `${beforeDot}.${afterDot}`;
    return joined ? parseFloat(joined) : 0;
  }
  
  return cleanStr ? parseFloat(cleanStr) : 0;
}

/**
 * Format a float number with specified decimal places (defaults to 2)
 * e.g., 1.15 => "1.15"
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
