import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}

function placeholders(s: string) {
  return [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
}

function leaf(tree: Tree, path: string) {
  return path.split(".").reduce<string | Tree>((t, k) => (t as Tree)[k], tree) as string;
}

describe("translations", () => {
  it("Hindi has exactly the English keys", () => {
    expect(keys(hi as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it("every Hindi string keeps the same placeholders, so nothing renders as {name}", () => {
    for (const k of keys(en as Tree)) expect(placeholders(leaf(hi as Tree, k)), k).toEqual(placeholders(leaf(en as Tree, k)));
  });
});
