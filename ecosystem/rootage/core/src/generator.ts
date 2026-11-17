import type {
  ComponentSpecDeclaration,
  TokenCollectionDeclaration,
  TokenDeclaration,
  TokenLit,
  ValueLit,
} from "./parser/ast";

/**
 * Common options for all generators
 */
export interface GeneratorOptions {
  /** Optional prefix for generated tokens */
  prefix?: string;
}

/**
 * Generator function signature for creating output from design tokens
 */
export type GeneratorFunction = (
  ast: {
    tokens: TokenDeclaration[];
    tokenCollections: TokenCollectionDeclaration[];
  },
  options: GeneratorOptions,
) => string | Promise<string>;

/**
 * Generator module can export either:
 * - A default function
 * - A named 'generate' function
 * - A named 'getTokenCss' function (for backwards compatibility)
 */
export interface GeneratorModule {
  default?: GeneratorFunction;
  generate?: GeneratorFunction;
  getTokenCss?: GeneratorFunction;
}

export interface ComponentSpecGeneratorOptions extends GeneratorOptions {
  /** Resolves a token reference to one value per collection mode, in the collection's mode order. */
  resolveTokenValues: (token: TokenLit) => ValueLit[] | undefined;
}

/** A generated file, with its path relative to the output directory. */
export interface GeneratedFile {
  path: string;
  code: string;
}

/**
 * Generator function signature for creating component spec files
 */
export type ComponentSpecGeneratorFunction = (
  ast: { componentSpecs: ComponentSpecDeclaration[] },
  options: ComponentSpecGeneratorOptions,
) => GeneratedFile[] | Promise<GeneratedFile[]>;

async function loadGenerator<T>(generatorPath: string): Promise<T> {
  let module: { default?: T };

  try {
    // Convert relative paths to absolute paths
    const absolutePath = generatorPath.startsWith(".")
      ? new URL(generatorPath, `file://${process.cwd()}/`).pathname
      : generatorPath;

    // Dynamic import
    module = await import(absolutePath);
  } catch (error) {
    throw new Error(
      `Failed to load generator from ${generatorPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!module.default) {
    throw new Error("Generator module must export a function (default)");
  }

  return module.default;
}

/**
 * Load and execute a generator
 */
export async function runGenerator(
  generatorPath: string,
  ast: {
    tokens: TokenDeclaration[];
    tokenCollections: TokenCollectionDeclaration[];
  },
  options: GeneratorOptions,
): Promise<string> {
  const generator = await loadGenerator<GeneratorFunction>(generatorPath);

  // Execute the generator
  const result = await generator(ast, options);

  if (typeof result !== "string") {
    throw new Error("Generator must return a string");
  }

  return result;
}

/**
 * Load and execute a component spec generator
 */
export async function runComponentSpecGenerator(
  generatorPath: string,
  ast: { componentSpecs: ComponentSpecDeclaration[] },
  options: ComponentSpecGeneratorOptions,
): Promise<GeneratedFile[]> {
  const generator = await loadGenerator<ComponentSpecGeneratorFunction>(generatorPath);

  const result: unknown = await generator(ast, options);

  const isFileList =
    Array.isArray(result) &&
    result.every(
      (file) =>
        typeof file === "object" &&
        file !== null &&
        typeof file.path === "string" &&
        typeof file.code === "string",
    );

  if (!isFileList) {
    throw new Error("Component spec generator must return an array of { path, code }");
  }

  return result;
}
