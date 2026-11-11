export interface HasilBatasPermintaan {
  dibatasi: boolean;
  sisa: number;
  resetMs: number;
}

export interface OpsiBatasPermintaan {
  batas?: number;
  jendelaMs?: number;
  sekarang?: number;
}

export function hasilBatasPermintaan(
  jumlah: number,
  batas: number,
  resetMs: number,
): HasilBatasPermintaan {
  return {
    dibatasi: jumlah > batas,
    sisa: Math.max(0, batas - jumlah),
    resetMs,
  };
}
export function saringPermintaanAktif(
  waktuPermintaan: number[],
  sekarang: number,
  jendelaMs: number,
): number[] {
  return waktuPermintaan
    .filter((waktu) => waktu > sekarang || sekarang - waktu < jendelaMs)
    .sort((a, b) => a - b);
}

export function milidetikKeKuotaBerikutnya(
  waktuPermintaan: number[],
  sekarang: number,
  jendelaMs: number,
): number {
  const waktuTertua = waktuPermintaan[0];
  return waktuTertua === undefined ? jendelaMs : Math.max(0, waktuTertua + jendelaMs - sekarang);
}
