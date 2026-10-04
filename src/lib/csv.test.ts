import { describe, expect, it } from "vitest";
import { parseCsv, toImportRows } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, commas, escaped quotes and newlines inside cells", () => {
    expect(parseCsv('a,b\n"x, y","he said ""hi"""\n"line1\nline2",z')).toEqual([["a", "b"], ["x, y", 'he said "hi"'], ["line1\nline2", "z"]]);
  });
  it("strips BOM, handles CRLF and skips blank lines", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n\r\n3,4\r\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
  it("detects semicolon delimiter (Excel in Arabic locales)", () => {
    expect(parseCsv("name;phone\nمقهى;0770")).toEqual([["name", "phone"], ["مقهى", "0770"]]);
  });
});

describe("toImportRows", () => {
  it("maps English and Arabic headers", () => {
    const t = toImportRows("الاسم,القسم,الهاتف,lat\nمطعم,restaurants,0770,35.4");
    expect(t.rows).toEqual([{ name: "مطعم", category: "restaurants", phone: "0770", lat: "35.4" }]);
    expect(t.missing).toEqual([]);
  });
  it("reports unknown and missing columns", () => {
    const t = toImportRows("title,phone\nx,1");
    expect(t.missing).toEqual(["name", "category"]);
    expect(t.unknownHeaders).toEqual(["title"]);
  });
  it("tolerates short rows", () => {
    expect(toImportRows("name,category,phone\nA,cafes").rows[0]).toEqual({ name: "A", category: "cafes", phone: "" });
  });
});
