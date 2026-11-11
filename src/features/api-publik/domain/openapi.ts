/**
 * Kontrak OpenAPI untuk API data publik.
 *
 * Spesifikasi disusun dari kode (bukan berkas statis) supaya ikut berubah saat
 * endpoint/parameter berubah. Semua endpoint hanya membaca data dan
 * menentukan desa dari header `Host`, tidak pernah dari input klien.
 */
export const JALUR_API_PUBLIK = {
  informasi: "/api/publik/informasi",
  dokumen: "/api/publik/dokumen",
  inventaris: "/api/publik/inventaris",
  surat: "/api/publik/surat",
  openapi: "/api/publik/openapi",
} as const;

export type NamaApiPublik = keyof typeof JALUR_API_PUBLIK;

const responsGalat = {
  description: "Permintaan gagal (desa tidak valid, rate limit, atau galat server).",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Galat" },
    },
  },
} as const;

function respons(
  dataSchema: Record<string, unknown>,
  additionalProperties: Record<string, unknown> = {},
) {
  return {
    "200": {
      description: "Berhasil.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["success", "data"],
            properties: {
              success: { type: "boolean", const: true },
              data: dataSchema,
              ...additionalProperties,
            },
          },
        },
      },
    },
    "400": responsGalat,
    "429": responsGalat,
    "500": responsGalat,
  } as const;
}

/** Susun dokumen OpenAPI 3.1 untuk API publik. */
export function buatSpesifikasiOpenApi(serverUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "API Data Publik SID Desa",
      version: "1.0.0",
      description:
        "Endpoint baca-saja untuk data publik desa. Desa ditentukan dari header Host, " +
        "bukan dari parameter klien. Semua respons memakai bentuk { success, data }.",
    },
    servers: [{ url: serverUrl }],
    paths: {
      [JALUR_API_PUBLIK.informasi]: {
        get: {
          summary: "Profil desa, berita terbaru, dan satu halaman dokumen aktif",
          operationId: "getInformasiPublik",
          parameters: [
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Halaman dokumen.",
            },
            {
              name: "pageSize",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Jumlah dokumen per halaman.",
            },
          ],
          responses: respons({
            type: "object",
            properties: {
              profilDesa: { type: ["object", "null"] },
              berita: { type: "array", items: { type: "object" } },
              dokumen: { type: "array", items: { type: "object" } },
              dokumenPagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  pageSize: { type: "integer" },
                  totalItems: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          }),
        },
      },
      [JALUR_API_PUBLIK.dokumen]: {
        get: {
          summary: "Daftar dokumen publik aktif per halaman",
          operationId: "getDokumenPublik",
          parameters: [
            {
              name: "kategori",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter kategori dokumen.",
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
              description: "Nomor halaman.",
            },
            {
              name: "pageSize",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Jumlah dokumen per halaman.",
            },
          ],
          responses: respons(
            { type: "array", items: { type: "object" } },
            {
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  pageSize: { type: "integer" },
                  totalItems: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          ),
        },
      },
      [JALUR_API_PUBLIK.inventaris]: {
        get: {
          summary: "Daftar inventaris/aset desa",
          operationId: "getInventarisPublik",
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Cari berdasarkan nama, nomor, atau kode barang.",
            },
          ],
          responses: respons({
            type: "object",
            properties: {
              items: { type: "array", items: { type: "object" } },
              total: { type: "integer" },
            },
          }),
        },
      },
      [JALUR_API_PUBLIK.surat]: {
        get: {
          summary: "Agenda surat publik dan jenis surat yang dapat diverifikasi",
          operationId: "getSuratPublik",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: respons({
            type: "object",
            properties: {
              agenda: { type: "array", items: { type: "object" } },
              jenisSurat: { type: "array", items: { type: "object" } },
            },
          }),
        },
      },
      [JALUR_API_PUBLIK.openapi]: {
        get: {
          summary: "Dokumen kontrak OpenAPI ini",
          operationId: "getOpenApi",
          responses: {
            "200": {
              description: "Dokumen OpenAPI 3.1.",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Galat: {
          type: "object",
          required: ["success", "error"],
          properties: {
            success: { type: "boolean", const: false },
            error: { type: "string" },
          },
        },
      },
    },
  } as const;
}
