import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { mailboxPesan } from "@/db/schema/mailbox-pesan";

export type MailboxBaris = Pick<
  typeof mailboxPesan.$inferSelect,
  "id" | "arah" | "alamat" | "subjek" | "isi" | "dibaca" | "createdAt"
>;

export async function listMailboxPesan(villageId: number): Promise<MailboxBaris[]> {
  return db
    .select({
      id: mailboxPesan.id,
      arah: mailboxPesan.arah,
      alamat: mailboxPesan.alamat,
      subjek: mailboxPesan.subjek,
      isi: mailboxPesan.isi,
      dibaca: mailboxPesan.dibaca,
      createdAt: mailboxPesan.createdAt,
    })
    .from(mailboxPesan)
    .where(eq(mailboxPesan.villageId, villageId))
    .orderBy(desc(mailboxPesan.createdAt), desc(mailboxPesan.id))
    .limit(100);
}

export async function simpanMailboxPesan(data: typeof mailboxPesan.$inferInsert): Promise<number> {
  const [row] = await db.insert(mailboxPesan).values(data).$returningId();
  if (!row) throw new Error("Gagal menyimpan pesan email.");
  return row.id;
}

export async function getPesanMasukMailbox(
  villageId: number,
  id: number,
): Promise<MailboxBaris | null> {
  const [row] = await db
    .select({
      id: mailboxPesan.id,
      arah: mailboxPesan.arah,
      alamat: mailboxPesan.alamat,
      subjek: mailboxPesan.subjek,
      isi: mailboxPesan.isi,
      dibaca: mailboxPesan.dibaca,
      createdAt: mailboxPesan.createdAt,
    })
    .from(mailboxPesan)
    .where(
      and(
        eq(mailboxPesan.villageId, villageId),
        eq(mailboxPesan.id, id),
        eq(mailboxPesan.arah, "masuk"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function tandaiMailboxDibaca(villageId: number, id: number): Promise<void> {
  await db
    .update(mailboxPesan)
    .set({ dibaca: true })
    .where(
      and(
        eq(mailboxPesan.villageId, villageId),
        eq(mailboxPesan.id, id),
        eq(mailboxPesan.arah, "masuk"),
      ),
    );
}
