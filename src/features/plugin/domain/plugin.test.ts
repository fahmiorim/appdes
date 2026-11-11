import { describe, expect, it } from "vitest";

import { cariPlugin, envBelumSiap, PLUGIN_MANIFEST } from "./plugin";

describe("plugin domain", () => {
  it("mencari plugin berdasarkan slug dan menolak slug asing", () => {
    expect(cariPlugin("whatsapp-gateway")?.nama).toBe("WhatsApp (Baileys)");
    expect(cariPlugin("tidak-ada")).toBeUndefined();
  });

  it("setiap manifest memiliki slug unik; WhatsApp tidak butuh env", () => {
    const slugs = PLUGIN_MANIFEST.map((plugin) => plugin.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(cariPlugin("whatsapp-gateway")?.envKeys).toEqual([]);
  });

  it("melaporkan environment yang kosong atau hanya spasi", () => {
    const plugin = cariPlugin("email-resend");
    if (!plugin) throw new Error("manifest tidak ditemukan");

    expect(envBelumSiap(plugin, { RESEND_API_KEY: "re_123", RESEND_FROM: "   " })).toEqual([
      "RESEND_FROM",
    ]);
    expect(
      envBelumSiap(plugin, { RESEND_API_KEY: "re_123", RESEND_FROM: "desa@contoh.id" }),
    ).toEqual([]);
  });
});
