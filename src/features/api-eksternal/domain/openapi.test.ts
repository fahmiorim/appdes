import { describe, expect, it } from "vitest";

import { buatSpesifikasiOpenApiEksternal } from "./openapi";

const REF_GALAT = "#/components/schemas/Galat";

const spesifikasi = buatSpesifikasiOpenApiEksternal("https://desa.contoh");
const paths = spesifikasi.paths;
const suratToken = paths["/api/eksternal/surat/{token}"].get.responses;
const suratVerifikasi = paths["/api/eksternal/surat/verifikasi"].post.responses;
const suratBaru = paths["/api/eksternal/surat"].post.responses;
const tte = paths["/api/eksternal/tte/tanda-tangan"].post.responses;
const dokumenOpenApi = paths["/api/eksternal/openapi"].get;

describe("kontrak OpenAPI API eksternal", () => {
  it("mendokumentasikan endpoint OpenAPI sebagai publik", () => {
    expect(dokumenOpenApi.security).toEqual([]);
    expect(spesifikasi.security).toEqual([{ ApiKeyAuth: [] }]);
  });

  it("mendokumentasikan skema sukses, bukan hanya deskripsi", () => {
    expect(suratToken["200"].content["application/json"].schema.$ref).toBe(
      "#/components/schemas/SuratRingkas",
    );
    expect(suratVerifikasi["200"].content["application/json"].schema.$ref).toBe(
      "#/components/schemas/SuratRingkas",
    );
    expect(suratBaru["201"].content["application/json"].schema.$ref).toBe(
      "#/components/schemas/PermohonanSuratDibuat",
    );
  });

  it("mendokumentasikan seluruh status yang benar-benar dikembalikan route", () => {
    // GET token: format token salah (400), format galat lama 400 tidak didokumentasikan.
    expect(Object.keys(suratToken)).toEqual(
      expect.arrayContaining(["200", "400", "401", "404", "429", "500"]),
    );
    // Verifikasi: 404 (tidak ditemukan) dan 413 (body > 8 KB).
    expect(Object.keys(suratVerifikasi)).toEqual(
      expect.arrayContaining(["200", "400", "401", "404", "413", "429", "500"]),
    );
    // Pengajuan: 413 (badan terlalu besar) dan 500 (galat tak terduga).
    expect(Object.keys(suratBaru)).toEqual(expect.arrayContaining(["201", "413", "500"]));
    expect(Object.keys(tte)).toEqual(expect.arrayContaining(["200", "400", "415", "422"]));
  });

  it("memakai bentuk galat yang sama pada setiap respons 4xx/5xx", () => {
    const semua = {
      ...suratToken,
      ...suratVerifikasi,
      ...suratBaru,
      ...tte,
    } as Record<string, { content?: { "application/json"?: { schema?: { $ref?: string } } } }>;

    for (const [status, respons] of Object.entries(semua)) {
      if (!status.startsWith("4") && !status.startsWith("5")) continue;
      expect(respons.content?.["application/json"]?.schema?.$ref, `status ${status}`).toBe(
        REF_GALAT,
      );
    }
  });
});
