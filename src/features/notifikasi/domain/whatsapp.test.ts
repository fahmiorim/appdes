import { describe, expect, it } from "vitest";

import { normalisasiNomorWhatsApp } from "./whatsapp";

describe("normalisasiNomorWhatsApp", () => {
  it("mengubah nomor lokal 08 menjadi JID 62", () => {
    expect(normalisasiNomorWhatsApp("08123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("mempertahankan nomor yang sudah berawalan 62", () => {
    expect(normalisasiNomorWhatsApp("628123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("menerima format +62, spasi, dan tanda hubung", () => {
    expect(normalisasiNomorWhatsApp("+62 812-3456-7890")).toBe("6281234567890@s.whatsapp.net");
  });

  it("menambahkan 62 pada nomor yang diawali 8", () => {
    expect(normalisasiNomorWhatsApp("8123456789")).toBe("628123456789@s.whatsapp.net");
  });

  it("menolak masukan tanpa digit atau terlalu pendek", () => {
    expect(normalisasiNomorWhatsApp("bukan nomor")).toBeNull();
    expect(normalisasiNomorWhatsApp("0812")).toBeNull();
  });
});
