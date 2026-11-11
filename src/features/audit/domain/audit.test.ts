import { describe, expect, it } from "vitest";

import { AUDIT_EVENT_LABELS, AUDIT_EVENTS } from "./audit";

describe("katalog event audit", () => {
  it("setiap event memiliki label yang dapat ditampilkan", () => {
    for (const event of Object.values(AUDIT_EVENTS)) {
      expect(AUDIT_EVENT_LABELS[event], `label untuk ${event}`).toBeTruthy();
    }
  });

  it("tidak ada label tanpa event", () => {
    const events = new Set<string>(Object.values(AUDIT_EVENTS));
    for (const key of Object.keys(AUDIT_EVENT_LABELS)) {
      expect(events.has(key), `label yatim ${key}`).toBe(true);
    }
  });
});
