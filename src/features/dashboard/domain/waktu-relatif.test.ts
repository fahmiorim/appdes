import { describe, expect, it } from "vitest";

import { waktuRelatif } from "./waktu-relatif";

describe("waktuRelatif", () => {
  const sekarang = new Date(2026, 10, 19, 12, 0, 0);

  it("menampilkan 'baru saja' untuk selisih di bawah satu menit", () => {
    expect(waktuRelatif(new Date(2026, 10, 19, 11, 59, 30), sekarang)).toBe("baru saja");
    expect(waktuRelatif(new Date(2026, 10, 19, 12, 5, 0), sekarang)).toBe("baru saja");
  });

  it("memakai menit, jam, lalu hari untuk rentang pendek", () => {
    expect(waktuRelatif(new Date(2026, 10, 19, 11, 50, 0), sekarang)).toBe("10 menit lalu");
    expect(waktuRelatif(new Date(2026, 10, 19, 9, 0, 0), sekarang)).toBe("3 jam lalu");
    expect(waktuRelatif(new Date(2026, 10, 17, 12, 0, 0), sekarang)).toBe("2 hari lalu");
  });

  it("beralih ke tanggal absolut setelah sepekan", () => {
    expect(waktuRelatif(new Date(2026, 10, 11, 12, 0, 0), sekarang)).toMatch(/2026/);
  });
});
