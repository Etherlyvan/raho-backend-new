/** Format YYMM, contoh: April 2026 → "2604" */
function yyMM(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

/** 5 karakter terakhir cuid, uppercase — untuk uniqueness */
function tail(id: string, len = 5): string {
  return id.slice(-len).toUpperCase();
}

/**
 * PKG-{CABANG}-{TYPE}-{YYMM}-{TAIL}
 * Contoh: PKG-JKT-BST-2604-XY9A1
 */
export function generatePackageCode(
  branchCode:      string,
  packageType:     'BASIC' | 'BOOSTER',
  memberPackageId: string,
  createdAt?:      Date,
): string {
  const cabang = branchCode.slice(0, 3).toUpperCase();
  const type   = packageType === 'BOOSTER' ? 'BST' : 'BSC';
  return `PKG-${cabang}-${type}-${yyMM(createdAt)}-${tail(memberPackageId)}`;
}

/**
 * ENC-{CABANG}-{TYPE}-{YYMM}-{TAIL}
 * Contoh: ENC-JKT-TRT-2604-AB3Z9
 */
export function generateEncounterCode(
  branchCode:  string,
  type:        'CONSULTATION' | 'TREATMENT',
  encounterId: string,
  createdAt?:  Date,
): string {
  const cabang    = branchCode.slice(0, 3).toUpperCase();
  const typeShort = type === 'TREATMENT' ? 'TRT' : 'CON';
  return `ENC-${cabang}-${typeShort}-${yyMM(createdAt)}-${tail(encounterId)}`;
}

/**
 * SES-{CABANG}-{INFUS_KE}-{YYMM}-{TAIL}
 * Contoh: SES-JKT-01-2604-P9QR2
 */
export function generateSessionCode(
  branchCode:         string,
  infusKe:            number,
  treatmentSessionId: string,
  createdAt?:         Date,
): string {
  const cabang = branchCode.slice(0, 3).toUpperCase();
  const ke     = String(infusKe).padStart(2, '0');
  return `SES-${cabang}-${ke}-${yyMM(createdAt)}-${tail(treatmentSessionId)}`;
}