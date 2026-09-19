import assert from "node:assert/strict";
import test from "node:test";
import { parse, todos } from "../output.js";

// every fixture below is what bend 2.0.16 printed for the file beside it

test("reads the line and the reason of a type error", () => {
  const out = [
    "Error:",
    "- expected : String",
    "- observed : U32",
    "Context:",
    "- x : U32",
    "Location: f",
    "2 | def f(x: U32) -> String:",
    "3>|   x",
    "4 | ",
  ].join("\n");
  assert.deepEqual(parse(out), {
    line: 3,
    message: [
      "- expected : String",
      "- observed : U32",
      "Context:",
      "- x : U32",
      "Location: f",
    ].join("\n"),
  });
});

test("reads a parse error, which names no def", () => {
  const out = [
    "Error:",
    "- expected : ':'",
    "- observed : 'x'",
    "Location:",
    "2 | def f(x: U32) -> U32",
    "3>|   x",
  ].join("\n");
  assert.equal(parse(out)?.line, 3);
});

test("reads an affine error, which marks the def line", () => {
  const out = [
    "Error:",
    "- expected : x",
    "- observed : x (consumed more than once)",
    "Location: f",
    "1 | ",
    "2>| def f(x: U32) -> U32:",
    "3 |   (x + x : U32)",
  ].join("\n");
  assert.equal(parse(out)?.line, 2);
});

test("a file that checks reports nothing", () => {
  assert.equal(parse("All terms check.\n"), undefined);
  assert.equal(parse("All terms check, with 2 unsafe annotations.\n"),
    undefined);
  assert.equal(parse("Error: no main to run\n"), undefined);
});

test("counts the open goals of an incomplete file", () => {
  assert.equal(todos("Error: 4 TODOs found.\nThe code is incomplete, and not"
    + " a valid proof yet.\n"), 4);
  assert.equal(todos("Error: 1 TODO found.\n"), 1);
  assert.equal(todos("All terms check.\n"), undefined);
});
