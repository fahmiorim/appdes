import "server-only";

import { and, desc, eq, like, max, or } from "drizzle-orm";

import { db } from "@/db";
import { denganKunciMysql } from "@/db/kunci-mysql";
import { incomingLetters, letterClassifications, outgoingLetters } from "@/db/schema";
import type { SuratKeluarInput, SuratMasukInput } from "@/features/surat/domain/surat";

export async function listSuratMasuk(villageId: number, search = "") {
  const filters = [eq(incomingLetters.villageId, villageId)];
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    const match = or(
      like(incomingLetters.letterNumber, term),
      like(incomingLetters.sender, term),
      like(incomingLetters.summary, term),
    );
    if (match) filters.push(match);
  }
  return db
    .select({
      id: incomingLetters.id,
      agendaNumber: incomingLetters.agendaNumber,
      receivedDate: incomingLetters.receivedDate,
      letterNumber: incomingLetters.letterNumber,
      letterDate: incomingLetters.letterDate,
      sender: incomingLetters.sender,
      classificationId: incomingLetters.classificationId,
      classificationName: letterClassifications.name,
      summary: incomingLetters.summary,
      disposition: incomingLetters.disposition,
      archiveLocation: incomingLetters.archiveLocation,
    })
    .from(incomingLetters)
    .leftJoin(
      letterClassifications,
      and(
        eq(incomingLetters.villageId, letterClassifications.villageId),
        eq(incomingLetters.classificationId, letterClassifications.id),
      ),
    )
    .where(and(...filters))
    .orderBy(desc(incomingLetters.receivedDate), desc(incomingLetters.id));
}

export async function getSuratMasuk(villageId: number, id: number) {
  const [row] = await db
    .select({
      id: incomingLetters.id,
      agendaNumber: incomingLetters.agendaNumber,
      receivedDate: incomingLetters.receivedDate,
      letterNumber: incomingLetters.letterNumber,
      letterDate: incomingLetters.letterDate,
      sender: incomingLetters.sender,
      classificationId: incomingLetters.classificationId,
      classificationName: letterClassifications.name,
      summary: incomingLetters.summary,
      disposition: incomingLetters.disposition,
      archiveLocation: incomingLetters.archiveLocation,
    })
    .from(incomingLetters)
    .leftJoin(
      letterClassifications,
      and(
        eq(incomingLetters.villageId, letterClassifications.villageId),
        eq(incomingLetters.classificationId, letterClassifications.id),
      ),
    )
    .where(and(eq(incomingLetters.villageId, villageId), eq(incomingLetters.id, id)))
    .limit(1);
  return row ?? null;
}

export async function saveSuratMasuk(villageId: number, id: number | null, input: SuratMasukInput) {
  const values = {
    agendaNumber: input.agendaNumber,
    receivedDate: input.receivedDate,
    letterNumber: input.letterNumber || "-",
    letterDate: input.letterDate || null,
    sender: input.sender || null,
    classificationId: input.classificationId,
    summary: input.summary || null,
    disposition: input.disposition || null,
    archiveLocation: input.archiveLocation || null,
  };
  if (id === null) {
    return denganKunciMysql(`agenda:masuk:${villageId}`, async () => {
      let agendaNumber = values.agendaNumber;
      if (agendaNumber <= 0) {
        const [last] = await db
          .select({ value: max(incomingLetters.agendaNumber) })
          .from(incomingLetters)
          .where(eq(incomingLetters.villageId, villageId));
        agendaNumber = Number(last?.value ?? 0) + 1;
      }
      const [row] = await db
        .insert(incomingLetters)
        .values({ villageId, ...values, agendaNumber })
        .$returningId();
      if (!row) throw new Error("Gagal menambahkan surat masuk.");
      return row.id;
    });
  }
  await db
    .update(incomingLetters)
    .set(values)
    .where(and(eq(incomingLetters.villageId, villageId), eq(incomingLetters.id, id)));
  return id;
}

export async function deleteSuratMasuk(villageId: number, id: number) {
  await db
    .delete(incomingLetters)
    .where(and(eq(incomingLetters.villageId, villageId), eq(incomingLetters.id, id)));
}

export async function listSuratKeluar(villageId: number, search = "") {
  const filters = [eq(outgoingLetters.villageId, villageId)];
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    const match = or(
      like(outgoingLetters.letterNumber, term),
      like(outgoingLetters.recipient, term),
      like(outgoingLetters.summary, term),
    );
    if (match) filters.push(match);
  }
  return db
    .select({
      id: outgoingLetters.id,
      agendaNumber: outgoingLetters.agendaNumber,
      letterNumber: outgoingLetters.letterNumber,
      letterDate: outgoingLetters.letterDate,
      recipient: outgoingLetters.recipient,
      classificationId: outgoingLetters.classificationId,
      classificationName: letterClassifications.name,
      summary: outgoingLetters.summary,
      sentDate: outgoingLetters.sentDate,
      archiveLocation: outgoingLetters.archiveLocation,
    })
    .from(outgoingLetters)
    .leftJoin(
      letterClassifications,
      and(
        eq(outgoingLetters.villageId, letterClassifications.villageId),
        eq(outgoingLetters.classificationId, letterClassifications.id),
      ),
    )
    .where(and(...filters))
    .orderBy(desc(outgoingLetters.letterDate), desc(outgoingLetters.id));
}

export async function getSuratKeluar(villageId: number, id: number) {
  const [row] = await db
    .select({
      id: outgoingLetters.id,
      agendaNumber: outgoingLetters.agendaNumber,
      letterNumber: outgoingLetters.letterNumber,
      letterDate: outgoingLetters.letterDate,
      recipient: outgoingLetters.recipient,
      classificationId: outgoingLetters.classificationId,
      classificationName: letterClassifications.name,
      summary: outgoingLetters.summary,
      sentDate: outgoingLetters.sentDate,
      archiveLocation: outgoingLetters.archiveLocation,
    })
    .from(outgoingLetters)
    .leftJoin(
      letterClassifications,
      and(
        eq(outgoingLetters.villageId, letterClassifications.villageId),
        eq(outgoingLetters.classificationId, letterClassifications.id),
      ),
    )
    .where(and(eq(outgoingLetters.villageId, villageId), eq(outgoingLetters.id, id)))
    .limit(1);
  return row ?? null;
}

export async function saveSuratKeluar(
  villageId: number,
  id: number | null,
  input: SuratKeluarInput,
) {
  const values = {
    agendaNumber: input.agendaNumber,
    letterNumber: input.letterNumber || "-",
    letterDate: input.letterDate,
    recipient: input.recipient || null,
    classificationId: input.classificationId,
    summary: input.summary || null,
    sentDate: input.sentDate || null,
    archiveLocation: input.archiveLocation || null,
  };
  if (id === null) {
    return denganKunciMysql(`agenda:keluar:${villageId}`, async () => {
      let agendaNumber = values.agendaNumber;
      if (agendaNumber <= 0) {
        const [last] = await db
          .select({ value: max(outgoingLetters.agendaNumber) })
          .from(outgoingLetters)
          .where(eq(outgoingLetters.villageId, villageId));
        agendaNumber = Number(last?.value ?? 0) + 1;
      }
      const [row] = await db
        .insert(outgoingLetters)
        .values({ villageId, ...values, agendaNumber })
        .$returningId();
      if (!row) throw new Error("Gagal menambahkan surat keluar.");
      return row.id;
    });
  }
  await db
    .update(outgoingLetters)
    .set(values)
    .where(and(eq(outgoingLetters.villageId, villageId), eq(outgoingLetters.id, id)));
  return id;
}

export async function deleteSuratKeluar(villageId: number, id: number) {
  await db
    .delete(outgoingLetters)
    .where(and(eq(outgoingLetters.villageId, villageId), eq(outgoingLetters.id, id)));
}
