import {
  canVerifyStep as canVerifyStepSurat,
  nextVerificationStep,
  VERIFICATION_STEP_LABELS,
  VERIFICATION_STEP_ROLE_SLUGS,
  VERIFICATION_STEPS,
  type LetterStatus,
  type VerificationStep,
} from "./surat";

/**
 * Info tahap verifikasi untuk indikator visual di UI.
 */
export interface VerificationStepInfo {
  /** Tahap saat ini yang menunggu verifikasi (null jika selesai/blm diajukan). */
  currentStep: VerificationStep | null;
  /** Daftar tahap yang sudah disetujui (berurutan). */
  completedSteps: VerificationStep[];
  /** Daftar tahap yang belum dijangkau (pending). */
  pendingSteps: VerificationStep[];
}

/**
 * Hasil validasi detail untuk verifikasi.
 */
export interface ValidationResult {
  ok: boolean;
  /** Kode error untuk UI (skip-step, double-approve, own-submission, wrong-role, wrong-sequence, not-pending). */
  errorCode?: string;
  /** Pesan error human-readable. */
  error?: string;
}

/**
 * Data surat minimal yang dibutuhkan untuk validasi verifikasi.
 */
export interface SuratVerificationData {
  id: number;
  status: LetterStatus;
  verifikasiOperator: boolean | null;
  verifikasiSekdes: boolean | null;
  verifikasiKades: boolean | null;
  /** ID pengguna pembuat surat (untuk cek own-submission). */
  createdBy?: string | null;
}

/**
 * Mapping role slug ke step verifikasi.
 * operator → step1 (operator)
 * sekretaris-desa → step2 (sekdes)
 * kepala-desa → step3 (kades)
 */
export const ROLE_TO_VERIFICATION_STEP: Readonly<Record<string, VerificationStep>> = {
  operator: "operator",
  "sekretaris-desa": "sekdes",
  "kepala-desa": "kades",
} as const;

/**
 * Cek apakah role (slug) berwenang memverifikasi step tertentu.
 * Superadmin di-handle di layer use-case, fungsi ini hanya cek mapping role→step.
 */
export function roleCanVerifyStep(roleSlug: string | null, step: VerificationStep): boolean {
  if (!roleSlug) return false;
  return VERIFICATION_STEP_ROLE_SLUGS[step].includes(roleSlug);
}

/**
 * Cek apakah step bisa diverifikasi pada surat ini (enforce sequence).
 * Re-export dari domain surat dengan tipe yang lebih spesifik.
 */
export function canVerifyStep(surat: SuratVerificationData, step: VerificationStep): boolean {
  return canVerifyStepSurat(
    {
      status: surat.status,
      verifikasiOperator: surat.verifikasiOperator,
      verifikasiSekdes: surat.verifikasiSekdes,
      verifikasiKades: surat.verifikasiKades,
    },
    step,
  );
}

/**
 * Dapatkan info lengkap tahap verifikasi untuk indikator visual.
 */
export function getVerificationStepInfo(surat: SuratVerificationData): VerificationStepInfo {
  const currentStep = nextVerificationStep({
    status: surat.status,
    verifikasiOperator: surat.verifikasiOperator,
    verifikasiSekdes: surat.verifikasiSekdes,
    verifikasiKades: surat.verifikasiKades,
  });

  const completedSteps: VerificationStep[] = [];
  if (surat.verifikasiOperator) completedSteps.push("operator");
  if (surat.verifikasiSekdes) completedSteps.push("sekdes");
  if (surat.verifikasiKades) completedSteps.push("kades");

  const pendingSteps = VERIFICATION_STEPS.filter(
    (step) => !completedSteps.includes(step) && step !== currentStep,
  );

  return {
    currentStep,
    completedSteps,
    pendingSteps,
  };
}

/**
 * Validasi lengkap untuk aksi verifikasi (approve/reject).
 * Mengembalikan detail error untuk UI: skip-step, double-approve, own-submission, wrong-role, wrong-sequence, not-pending.
 */
export function validateVerification(
  userRoleSlug: string | null,
  userId: string | number,
  surat: SuratVerificationData,
  step: VerificationStep,
  isSuperadmin: boolean = false,
): ValidationResult {
  // 1. Surat harus status "verifikasi"
  if (surat.status !== "verifikasi") {
    return {
      ok: false,
      errorCode: "not-pending",
      error: "Surat tidak sedang menunggu verifikasi.",
    };
  }

  // 2. Cek own-submission pada tahap persetujuan.
  //
  // Tahap operator dikecualikan: operator menyusun konsep lalu mengajukan dan
  // memang memeriksa konsepnya sendiri (alur OpenSID). Larangan berlaku saat
  // pembuat hendak menyetujui karyanya pada tahap sekdes/kades.
  if (
    step !== "operator" &&
    surat.createdBy !== null &&
    surat.createdBy !== undefined &&
    surat.createdBy === String(userId)
  ) {
    return {
      ok: false,
      errorCode: "own-submission",
      error: "Anda tidak boleh memverifikasi surat yang Anda buat sendiri.",
    };
  }

  // 3. Cek role (superadmin bypass)
  if (!isSuperadmin && !roleCanVerifyStep(userRoleSlug, step)) {
    return {
      ok: false,
      errorCode: "wrong-role",
      error: `Tahap ${VERIFICATION_STEP_LABELS[step]} bukan wewenang role Anda.`,
    };
  }

  // 4. Cek urutan (sequence) - hanya step berikutnya yang boleh dijalankan
  const nextStep = nextVerificationStep({
    status: surat.status,
    verifikasiOperator: surat.verifikasiOperator,
    verifikasiSekdes: surat.verifikasiSekdes,
    verifikasiKades: surat.verifikasiKades,
  });

  if (nextStep === null) {
    return {
      ok: false,
      errorCode: "not-pending",
      error: "Surat ini sudah selesai diverifikasi.",
    };
  }

  if (step !== nextStep) {
    // Deteksi double-approve (step sudah done) vs skip-step (step future)
    const stepIndex = VERIFICATION_STEPS.indexOf(step);
    const nextIndex = VERIFICATION_STEPS.indexOf(nextStep);

    if (stepIndex < nextIndex) {
      // Step sudah selesai (double approve)
      return {
        ok: false,
        errorCode: "double-approve",
        error: `Tahap ${VERIFICATION_STEP_LABELS[step]} sudah disetujui sebelumnya.`,
      };
    }

    // Step di masa depan (skip step)
    return {
      ok: false,
      errorCode: "skip-step",
      error: `Verifikasi harus berurutan. Tahap berikutnya: ${VERIFICATION_STEP_LABELS[nextStep]}.`,
    };
  }

  // 5. Validasi sequence (redundant check, tapi eksplisit)
  if (!canVerifyStep(surat, step)) {
    return {
      ok: false,
      errorCode: "wrong-sequence",
      error: `Verifikasi harus berurutan. Tahap berikutnya: ${VERIFICATION_STEP_LABELS[nextStep]}.`,
    };
  }

  return { ok: true };
}

/**
 * Helper: dapatkan label step untuk UI.
 */
export function getStepLabel(step: VerificationStep): string {
  return VERIFICATION_STEP_LABELS[step];
}

/**
 * Helper: dapatkan semua step labels berurutan.
 */
export function getAllStepLabels(): Readonly<Record<VerificationStep, string>> {
  return VERIFICATION_STEP_LABELS;
}

/**
 * Helper: cek apakah surat sudah selesai diverifikasi (semua 3 step approved).
 */
export function isFullyVerified(surat: SuratVerificationData): boolean {
  return (
    surat.verifikasiOperator === true &&
    surat.verifikasiSekdes === true &&
    surat.verifikasiKades === true
  );
}

/**
 * Helper: cek apakah surat sudah ditolak (status kembali ke draft dengan alasan).
 * Note: implementasi penolakan di layer use-case, di sini cek status saja.
 */
export function isRejected(surat: SuratVerificationData): boolean {
  return (
    surat.status === "draft" &&
    (surat.verifikasiOperator === false ||
      surat.verifikasiSekdes === false ||
      surat.verifikasiKades === false)
  );
}

/**
 * Bangun URL verifikasi publik dari origin dan token mentah.
 */
export function buildVerificationUrl(origin: string, token: string): string {
  const cleanOrigin = origin.trim().replace(/\/+$/, "");
  const cleanToken = encodeURIComponent(token.trim());
  return `${cleanOrigin}/desa/verifikasi-surat/${cleanToken}`;
}
