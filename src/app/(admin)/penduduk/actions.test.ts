import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

import { buatPendudukAction, ubahPendudukAction } from "./actions";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/features/penduduk/application/use-cases", () => ({
  createPenduduk: mocks.create,
  updatePenduduk: mocks.update,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidate,
}));

const awal = {
  nationalId: "",
  familyId: "",
  name: "Budi Santoso",
  gender: "male",
  birthPlace: "",
  birthDate: "",
  religionId: "",
  educationId: "",
  educationSedangId: "",
  occupationId: "",
  maritalStatusId: "",
  familyRelationId: "",
  bloodTypeId: "",
  citizenshipId: "",
  residenceStatus: "permanent",
  lifeStatus: "alive",
  regionId: "",
  address: "",
  phone: "",
  fatherName: "",
  motherName: "",
  fatherNationalId: "",
  motherNationalId: "",
};

function formulir(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [nama, nilai] of Object.entries({ ...awal, ...overrides })) {
    data.set(nama, nilai);
  }
  return data;
}

describe("Server Action penduduk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memetakan formulir, menyimpan, dan memakai id hasil create", async () => {
    mocks.create.mockResolvedValue({ id: 42 });

    const hasil = await buatPendudukAction(
      { status: "idle" },
      formulir({
        name: "  Budi Santoso ",
        nationalId: "3201012001120001",
        familyId: "7",
      }),
    );

    expect(hasil).toEqual({
      status: "success",
      message: "Data penduduk berhasil ditambahkan.",
      data: { id: 42 },
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Budi Santoso",
        nationalId: "3201012001120001",
        familyId: 7,
        religionId: null,
      }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/penduduk");
    expect(mocks.revalidate).toHaveBeenCalledWith("/penduduk/42");
  });

  it("menolak NIK tidak valid sebelum memanggil use case", async () => {
    const hasil = await buatPendudukAction({ status: "idle" }, formulir({ nationalId: "123" }));

    expect(hasil.status).toBe("error");
    if (hasil.status === "error") {
      expect(hasil.fieldErrors?.nationalId?.[0]).toBeTruthy();
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("meneruskan id dan input pada mode ubah", async () => {
    mocks.update.mockResolvedValue(undefined);

    const hasil = await ubahPendudukAction(
      { status: "idle" },
      formulir({ id: "99", name: "Budi Diperbarui" }),
    );

    expect(hasil).toEqual({
      status: "success",
      message: "Perubahan data penduduk disimpan.",
      data: { id: 99 },
    });
    expect(mocks.update).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ name: "Budi Diperbarui" }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/penduduk/99");
  });

  it("menolak id ubah yang tidak valid tanpa memanggil use case", async () => {
    const hasil = await ubahPendudukAction({ status: "idle" }, formulir({ id: "0" }));

    expect(hasil).toMatchObject({ status: "error" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("meneruskan pesan penolakan use case tanpa membocorkan detail internal", async () => {
    mocks.update.mockRejectedValue(new AppError("NOT_FOUND", "Data penduduk tidak ditemukan."));

    const hasil = await ubahPendudukAction(
      { status: "idle" },
      formulir({ id: "99", name: "Budi" }),
    );

    expect(hasil).toMatchObject({
      status: "error",
      message: "Data penduduk tidak ditemukan.",
    });
  });
});
