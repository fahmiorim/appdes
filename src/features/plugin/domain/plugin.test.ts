import { describe, expect, it } from "vitest";

import { cariPlugin, envBelumSiap, PLUGIN_MANIFEST } from "./plugin";

describe("plugin domain", () => {
  it("mencari plugin berdasarkan slug dan menolak slug asing", () => {
    expect(cariPlugin("whatsapp-gateway")?.nama).toBe("WhatsApp Gateway");
    expect(cariPlugin("tidak-ada")).toBeUndefined();
  });

  it("setiap manifest memiliki slug unik dan environment wajib", () => {
    const slugs = PLUGIN_MANIFEST.map((plugin) => plugin.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(PLUGIN_MANIFEST.every((plugin) => plugin.envKeys.length > 0)).toBe(true);
  });

  it("melaporkan environment yang kosong atau hanya spasi", () => {
    const plugin = cariPlugin("whatsapp-gateway");
    if (!plugin) throw new Error("manifest tidak ditemukan");

    expect(
      envBelumSiap(plugin, { WHATSAPP_API_URL: "https://wa.contoh", WHATSAPP_TOKEN: "   " }),
    ).toEqual(["WHATSAPP_TOKEN"]);
    expect(
      envBelumSiap(plugin, { WHATSAPP_API_URL: "https://wa.contoh", WHATSAPP_TOKEN: "token" }),
    ).toEqual([]);
  });
});
