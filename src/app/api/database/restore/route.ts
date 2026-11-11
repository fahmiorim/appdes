import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import Busboy from "busboy";

import { pulihkanBackupSql } from "@/features/database/application/database-use-cases";
import { isAllowedSqlFile, MAX_RESTORE_BYTES } from "@/features/database/domain/database";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

/** Kesalahan unggahan yang memang disebabkan permintaan klien (HTTP 400). */
class UnggahanError extends Error {}

type Unggahan = {
  filename: string;
  stream: Readable;
};

/**
 * Baca multipart langsung dari `request.body` dan serahkan bagian berkas
 * sebagai Readable. Isi berkas tidak pernah ditampung utuh di memori.
 *
 * Form menaruh `konfirmasi` sebelum input berkas sehingga nilainya sudah
 * terbaca saat bagian berkas tiba; tanpa itu restore tidak boleh dimulai.
 */
function bacaUnggahan(request: Request): Promise<Unggahan> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get("content-type") ?? "";
    const body = request.body;

    if (!body || !/^multipart\/form-data/i.test(contentType)) {
      reject(new UnggahanError("Permintaan restore harus multipart/form-data."));
      return;
    }

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { files: 1, fields: 4, parts: 4 },
    });
    let konfirmasi = false;
    let selesai = false;

    const gagal = (error: Error) => {
      if (selesai) return;
      selesai = true;
      reject(error);
    };

    busboy.on("field", (nama, nilai) => {
      if (nama === "konfirmasi" && nilai === "1") konfirmasi = true;
    });

    busboy.on("file", (nama, stream, info) => {
      if (nama !== "berkas" || selesai) {
        stream.resume();
        return;
      }
      // Error setelah stream diserahkan ditangani oleh pipeline restore;
      // listener ini mencegah error tak tertangani di sela penyerahan.
      stream.on("error", gagal);

      if (!konfirmasi) {
        stream.resume();
        gagal(new UnggahanError("Konfirmasi restore diperlukan untuk melindungi data."));
        return;
      }
      if (!info.filename || !isAllowedSqlFile(info.filename)) {
        stream.resume();
        gagal(new UnggahanError("Hanya berkas .sql atau .sql.gz yang diizinkan."));
        return;
      }

      selesai = true;
      resolve({ filename: info.filename, stream });
    });

    busboy.on("filesLimit", () =>
      gagal(new UnggahanError("Hanya satu berkas backup yang boleh diunggah.")),
    );
    busboy.on("partsLimit", () => gagal(new UnggahanError("Bagian unggahan terlalu banyak.")));
    busboy.on("error", () => gagal(new UnggahanError("Unggahan multipart tidak valid.")));
    busboy.on("close", () => gagal(new UnggahanError("Berkas backup wajib diunggah.")));

    Readable.fromWeb(body as unknown as NodeReadableStream<Uint8Array>).pipe(busboy);
  });
}

export async function POST(request: Request) {
  try {
    // Otorisasi dijalankan sebelum body disentuh: permintaan tak berizin tidak
    // boleh memaksa server membaca unggahan besar.
    await requireSuperAdmin();

    // Content-Length menjadi dasar pemeriksaan ukuran sebelum ada byte dump
    // yang dialirkan ke mysql, sehingga batas 200 MB tidak bisa terlewati.
    const panjang = request.headers.get("content-length");
    if (panjang === null) {
      return new Response(
        "Content-Length wajib disertakan agar ukuran unggahan dapat diperiksa sebelum restore.",
        { status: 411 },
      );
    }
    const ukuran = Number(panjang);
    if (!Number.isSafeInteger(ukuran) || ukuran <= 0) {
      return new Response("Content-Length tidak valid.", { status: 400 });
    }
    if (ukuran > MAX_RESTORE_BYTES) {
      return new Response("Ukuran unggahan melebihi batas 200 MB.", { status: 413 });
    }

    const unggahan = await bacaUnggahan(request);
    try {
      await pulihkanBackupSql({ ...unggahan, konfirmasi: true });
    } catch (error) {
      unggahan.stream.destroy();
      throw error;
    }
    return new Response(null, {
      status: 303,
      headers: { Location: "/pengaturan/database?restored=1" },
    });
  } catch (error) {
    if (error instanceof UnggahanError) {
      return new Response(error.message, { status: 400 });
    }
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }
    console.error("Gagal merestore database:", error);
    return new Response("Gagal merestore database.", { status: 500 });
  }
}
