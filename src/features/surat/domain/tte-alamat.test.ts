import { describe, expect, it } from "vitest";

import { hostTerlarang, klasifikasiAlamat } from "./tte-alamat";

describe("klasifikasiAlamat — IPv4", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "100.127.255.255",
    "0.0.0.0",
    "224.0.0.1",
    "239.255.255.250",
    "255.255.255.255",
    "192.0.2.10",
    "198.51.100.7",
    "203.0.113.9",
    "198.18.0.1",
    "192.88.99.1",
  ])("menolak alamat internal/reserved %s", (alamat) => {
    expect(klasifikasiAlamat(alamat)).toEqual({ adalahIp: true, publik: false });
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "203.0.114.1", "172.32.0.1"])(
    "mengizinkan unicast publik %s",
    (alamat) => {
      expect(klasifikasiAlamat(alamat)).toEqual({ adalahIp: true, publik: true });
    },
  );
});

describe("klasifikasiAlamat — IPv6", () => {
  it.each([
    "::",
    "::1",
    "fe80::1",
    "fec0::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "100::1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "2001::1",
    "2001:2::1",
    "2001:10::1",
    "2001:20::1",
    "3fff::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "64:ff9b::192.168.1.1",
    "64:ff9b::10.0.0.1",
  ])("menolak alamat internal/reserved %s", (alamat) => {
    expect(klasifikasiAlamat(alamat)).toEqual({ adalahIp: true, publik: false });
  });

  it.each(["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8", "64:ff9b::8.8.8.8"])(
    "mengizinkan unicast publik %s",
    (alamat) => {
      expect(klasifikasiAlamat(alamat)).toEqual({ adalahIp: true, publik: true });
    },
  );

  it("menerima bentuk bertanda kurung dari URL", () => {
    expect(klasifikasiAlamat("[2606:4700:4700::1111]")).toEqual({ adalahIp: true, publik: true });
    expect(klasifikasiAlamat("[::1]")).toEqual({ adalahIp: true, publik: false });
  });

  it("menolak zone id link-local", () => {
    expect(klasifikasiAlamat("fe80::1%eth0").publik).toBe(false);
  });
});

describe("klasifikasiAlamat — bukan IP", () => {
  it("hostname tidak dianggap sebagai alamat IP", () => {
    expect(klasifikasiAlamat("tte.example.go.id")).toEqual({ adalahIp: false, publik: false });
    expect(klasifikasiAlamat("")).toEqual({ adalahIp: false, publik: false });
  });
});

describe("hostTerlarang", () => {
  it.each([
    "localhost",
    "api.localhost",
    "metadata.google.internal",
    "metadata.goog",
    "metadata",
    "instance-data",
    "printer.local",
    "server.internal",
    "router.home.arpa",
    "nas.lan",
    "",
  ])("menolak host internal %s", (host) => {
    expect(hostTerlarang(host)).toBe(true);
  });

  it("mengizinkan hostname publik", () => {
    expect(hostTerlarang("tte.example.go.id")).toBe(false);
    expect(hostTerlarang("bsre.kominfo.go.id.")).toBe(false);
  });
});
