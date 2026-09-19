import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { parse, todos } from "./output.js";

const BIN = "bend";
const HOME = path.join(os.homedir(), ".bend", "bin", BIN);
const HOLE = /\?[A-Za-z_][A-Za-z0-9_]*/g;

function binary(): string | undefined {
  const set = vscode.workspace.getConfiguration("bend")
    .get<string>("check.path", "").trim();
  if (set !== "") {
    return set;
  }
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  const found = dirs.map((dir) => path.join(dir, BIN))
    .find((file) => fs.existsSync(file));
  return found ?? (fs.existsSync(HOME) ? HOME : undefined);
}

// the whole line, from its first word on: bend reports a line, not a column
function span(document: vscode.TextDocument, line: number): vscode.Range {
  const at = Math.min(Math.max(line - 1, 0), document.lineCount - 1);
  const text = document.lineAt(at);
  return new vscode.Range(at, text.firstNonWhitespaceCharacterIndex,
    at, text.text.length);
}

function holes(document: vscode.TextDocument): vscode.Diagnostic[] {
  const found: vscode.Diagnostic[] = [];
  const text = document.getText();
  for (const hole of text.matchAll(HOLE)) {
    const at = document.positionAt(hole.index);
    const range = new vscode.Range(at, document.positionAt(
      hole.index + hole[0].length));
    const spot = new vscode.Diagnostic(range, hole[0] + ": an open goal",
      vscode.DiagnosticSeverity.Information);
    spot.source = BIN;
    found.push(spot);
  }
  return found;
}

export class Checker {
  private readonly found = vscode.languages.createDiagnosticCollection(BIN);
  private readonly running = new Map<string, cp.ChildProcess>();
  private said = false;

  constructor(private readonly log: vscode.OutputChannel) {}

  dispose(): void {
    for (const child of this.running.values()) {
      child.kill();
    }
    this.found.dispose();
  }

  forget(document: vscode.TextDocument): void {
    this.found.delete(document.uri);
  }

  // -o emits instead of running, so a main with effects stays put; a file
  // with no main answers "no main to run" once it has checked
  check(document: vscode.TextDocument): void {
    if (document.languageId !== BIN || document.uri.scheme !== "file") {
      return;
    }
    if (!vscode.workspace.getConfiguration(BIN).get<boolean>("check.enable",
      true)) {
      this.found.delete(document.uri);
      return;
    }
    const bin = binary();
    if (bin === undefined) {
      if (!this.said) {
        this.said = true;
        this.log.appendLine("no bend found: no diagnostics. Set"
          + " bend.check.path to check.");
      }
      return;
    }
    const file = document.uri.fsPath;
    this.running.get(file)?.kill();
    const emit = path.join(os.tmpdir(), "bend-vscode-"
      + String(process.pid) + "-" + path.basename(file) + ".js");
    const child = cp.execFile(bin, [file, "-o", emit], {
      cwd: path.dirname(file),
      timeout: 20000,
    }, (_error, stdout, stderr) => {
      this.running.delete(file);
      fs.rm(emit, { force: true }, () => {});
      this.draw(document, stdout + stderr);
    });
    this.running.set(file, child);
  }

  private draw(document: vscode.TextDocument, out: string): void {
    if (todos(out) !== undefined) {
      this.found.set(document.uri, holes(document));
      return;
    }
    const spot = parse(out);
    if (spot === undefined) {
      this.found.set(document.uri, []);
      return;
    }
    const found = new vscode.Diagnostic(span(document, spot.line),
      spot.message, vscode.DiagnosticSeverity.Error);
    found.source = BIN;
    this.found.set(document.uri, [found]);
  }
}
