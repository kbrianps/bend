// What bend prints, read back. An error has a fixed shape: the reason, an
// optional context, the def it happened in, then the source around the
// line it marks with >. Everything before that source is the message.

export type Spot = { line: number; message: string };

const AT = /^ *(\d+)>\|/m;
const SNIPPET = /^ *\d+ *>?\|/;
const TODOS = /^Error: (\d+) TODOs? found\./m;

// how many goals the file leaves open, if that is what stopped it
export function todos(out: string): number | undefined {
  const found = TODOS.exec(out);
  return found === null ? undefined : Number(found[1]);
}

// the error bend reports, or nothing when the file checks
export function parse(out: string): Spot | undefined {
  const at = AT.exec(out);
  if (at === null) {
    return undefined;
  }
  const lines = out.split("\n");
  const head = lines.findIndex((line) => SNIPPET.test(line));
  const message = lines.slice(0, head < 0 ? lines.length : head)
    .filter((line) => line.trim() !== "" && line.trim() !== "Error:")
    .join("\n").trim();
  return {
    line: Number(at[1]),
    message: message === "" ? out.trim() : message,
  };
}
