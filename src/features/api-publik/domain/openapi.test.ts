import { describe, expect, it } from "vitest";

import { buatSpesifikasiOpenApi, JALUR_API_PUBLIK } from "./openapi";

describe("buatSpesifikasiOpenApi", () => {
  const spec = buatSpesifikasiOpenApi("https://desa.example.id");

  it("memakai OpenAPI 3.1 dan URL server dari pemanggil", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers).toEqual([{ url: "https://desa.example.id" }]);
  });

  it("mendokumentasikan seluruh endpoint data publik", () => {
    for (const jalur of Object.values(JALUR_API_PUBLIK)) {
      expect(spec.paths[jalur as keyof typeof spec.paths]).toBeDefined();
    }
    expect(Object.keys(spec.paths)).toHaveLength(Object.keys(JALUR_API_PUBLIK).length);
  });

  it("mendokumentasikan parameter kueri yang dipakai route", () => {
    const parameterDokumen =
      spec.paths[JALUR_API_PUBLIK.dokumen].get.parameters?.map((p) => p.name) ?? [];
    expect(parameterDokumen).toEqual(expect.arrayContaining(["kategori", "page", "pageSize"]));
    expect(spec.paths[JALUR_API_PUBLIK.informasi].get.parameters?.map((p) => p.name)).toEqual(
      expect.arrayContaining(["page", "pageSize"]),
    );
    expect(spec.paths[JALUR_API_PUBLIK.inventaris].get.parameters?.map((p) => p.name)).toContain(
      "search",
    );
    expect(spec.paths[JALUR_API_PUBLIK.surat].get.parameters?.map((p) => p.name)).toContain(
      "limit",
    );
  });

  it("mendokumentasikan metadata halaman pada endpoint dokumen", () => {
    const response = spec.paths[JALUR_API_PUBLIK.dokumen].get.responses["200"];
    const schema = response.content["application/json"].schema as {
      properties: Record<string, unknown>;
    };
    expect(schema.properties.pagination).toBeDefined();
  });

  it("mendokumentasikan bentuk galat yang seragam", () => {
    expect(spec.components.schemas.Galat.required).toEqual(["success", "error"]);
    expect(spec.paths[JALUR_API_PUBLIK.informasi].get.responses["429"]).toBeDefined();
  });
});
