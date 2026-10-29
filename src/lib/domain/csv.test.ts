import { describe, expect, it } from "vitest";
import { csvCell, csvRecords, parseCsv } from "./csv";

describe("csv", () => {
  it("reads quoted fields with commas, quotes and line breaks", () => {
    expect(parseCsv('a,"b, c","say ""hi""","two\nlines"\n1,2,3,4')).toEqual([
      ["a", "b, c", 'say "hi"', "two\nlines"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("handles Excel's byte-order mark, CRLF endings and trailing blank rows", () => {
    expect(parseCsv("﻿name,roll\r\nAarav,NIT22\r\n,\r\n\r\n")).toEqual([
      ["name", "roll"],
      ["Aarav", "NIT22"],
    ]);
  });

  it("keys records by a normalised header", () => {
    const { headers, records } = csvRecords("Roll No.,Full Name\n nit22cs041 , Aarav Mehta\n");
    expect(headers).toEqual(["roll_no", "full_name"]);
    expect(records).toEqual([{ roll_no: "nit22cs041", full_name: "Aarav Mehta" }]);
  });

  it("writes cells Excel won't run as formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell('a "b"')).toBe(`"a ""b"""`);
  });
});
