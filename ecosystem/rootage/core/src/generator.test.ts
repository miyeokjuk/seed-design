import { afterAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runComponentSpecGenerator } from "./generator";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rootage-generator-"));

function writeGenerator(name: string, source: string) {
  const filePath = path.join(dir, `${name}.mjs`);
  fs.writeFileSync(filePath, source);

  return filePath;
}

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("runComponentSpecGenerator", () => {
  const options = { prefix: "test", resolveTokenValues: () => undefined };

  it("passes the specs and options through and returns the generated files", async () => {
    const generatorPath = writeGenerator(
      "files",
      `export default (ast, options) => [{ path: "summary.txt", code: \`\${options.prefix}:\${ast.componentSpecs.length}\` }];`,
    );

    expect(await runComponentSpecGenerator(generatorPath, { componentSpecs: [] }, options)).toEqual(
      [{ path: "summary.txt", code: "test:0" }],
    );
  });

  it("rejects a generator that does not return files", async () => {
    const generatorPath = writeGenerator(
      "string",
      `export default () => "export const vars = {}";`,
    );

    await expect(
      runComponentSpecGenerator(generatorPath, { componentSpecs: [] }, options),
    ).rejects.toThrow();
  });

  it("rejects a module without a default export", async () => {
    const generatorPath = writeGenerator("named", "export const generate = () => [];");

    await expect(
      runComponentSpecGenerator(generatorPath, { componentSpecs: [] }, options),
    ).rejects.toThrow();
  });
});
