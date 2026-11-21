import "server-only";

import { and, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import { letterClassifications, letterDinas } from "@/db/schema";
import type { SuratDinasInput } from "@/features/surat/domain/surat";

export async function listSuratDinas(villageId: number, search = "") {
  const filters = [eq(letterDinas.villageId, villageId)];
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    const match = or(
      like(letterDinas.letterNumber, term),
      like(letterDinas.recipient, term),
      like(letterDinas.subject, term),
      like(letterDinas.archiveLocation, term),
    );
    if (match) filters.push(match);
  }
  return db
    .select({
      id: letterDinas.id,
      letterNumber: letterDinas.letterNumber,
      letterDate: letterDinas.letterDate,
      recipient: letterDinas.recipient,
      recipientAddress: letterDinas.recipientAddress,
      subject: letterDinas.subject,
      content: letterDinas.content,
      classificationId: letterDinas.classificationId,
      classificationName: letterClassifications.name,
      archiveFile: letterDinas.archiveFile,
      archiveLocation: letterDinas.archiveLocation,
    })
    .from(letterDinas)
    .leftJoin(
      letterClassifications,
      and(
        eq(letterDinas.villageId, letterClassifications.villageId),
        eq(letterDinas.classificationId, letterClassifications.id),
      ),
    )
    .where(and(...filters))
    .orderBy(desc(letterDinas.letterDate), desc(letterDinas.id));
}

export async function getSuratDinas(villageId: number, id: number) {
  const [row] = await db
    .select({
      id: letterDinas.id,
      letterNumber: letterDinas.letterNumber,
      letterDate: letterDinas.letterDate,
      recipient: letterDinas.recipient,
      recipientAddress: letterDinas.recipientAddress,
      subject: letterDinas.subject,
      content: letterDinas.content,
      classificationId: letterDinas.classificationId,
      classificationName: letterClassifications.name,
      archiveFile: letterDinas.archiveFile,
      archiveLocation: letterDinas.archiveLocation,
    })
    .from(letterDinas)
    .leftJoin(
      letterClassifications,
      and(
        eq(letterDinas.villageId, letterClassifications.villageId),
        eq(letterDinas.classificationId, letterClassifications.id),
      ),
    )
    .where(and(eq(letterDinas.villageId, villageId), eq(letterDinas.id, id)))
    .limit(1);
  return row ?? null;
}

export async function saveSuratDinas(villageId: number, id: number | null, input: SuratDinasInput) {
  const values = {
    letterNumber: input.letterNumber,
    letterDate: input.letterDate,
    recipient: input.recipient || null,
    recipientAddress: input.recipientAddress || null,
    subject: input.subject,
    content: input.content || null,
    classificationId: input.classificationId,
    archiveFile: input.hapusArsip ? null : input.archiveFile || null,
    archiveLocation: input.archiveLocation || null,
  };
  if (id === null) {
    const [created] = await db
      .insert(letterDinas)
      .values({ villageId, ...values })
      .$returningId();
    if (!created) throw new Error("Gagal menambahkan surat dinas.");
    return created.id;
  }
  await db
    .update(letterDinas)
    .set(values)
    .where(and(eq(letterDinas.villageId, villageId), eq(letterDinas.id, id)));
  return id;
}

export async function deleteSuratDinas(villageId: number, id: number) {
  await db
    .delete(letterDinas)
    .where(and(eq(letterDinas.villageId, villageId), eq(letterDinas.id, id)));
}
