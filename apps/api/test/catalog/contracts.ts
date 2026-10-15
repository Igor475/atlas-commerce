import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { parsers } from "prettier/plugins/yaml";
// Existing Prettier YAML parser + existing Nest CLI/Ajv 2020 validator. No new packages.
interface Node {
  type: string;
  value?: string;
  children?: Node[];
  anchor?: unknown;
  tag?: unknown;
}
function value(node: Node): unknown {
  if (node.anchor || node.tag) throw new Error("CAT_CONTRACT_UNSUPPORTED_YAML");
  const children = node.children ?? [];
  if (["mapping", "flowMapping"].includes(node.type)) {
    const result: Record<string, unknown> = Object.create(null);
    for (const pair of children) {
      const [key, entry] = pair.children ?? [];
      if (!key || !entry) throw new Error("CAT_CONTRACT_MAPPING_INVALID");
      const name = value(key);
      if (typeof name !== "string" || Object.hasOwn(result, name))
        throw new Error("CAT_CONTRACT_DUPLICATE_KEY");
      result[name] = value(entry);
    }
    return result;
  }
  if (["sequence", "flowSequence"].includes(node.type))
    return children.map(value);
  if (node.type === "plain") {
    if (node.value === "true") return true;
    if (node.value === "false") return false;
    if (node.value === "null" || node.value === "~") return null;
    if (/^-?\d+(?:\.\d+)?$/.test(node.value ?? "")) return Number(node.value);
    return node.value;
  }
  if (node.type === "quoteSingle" || node.type === "quoteDouble")
    return node.value;
  if (
    ["mappingKey", "mappingValue", "sequenceItem", "documentBody"].includes(
      node.type,
    )
  )
    return children.length ? value(children[0]!) : null;
  if (node.type === "document")
    return value(children.find((n) => n.type === "documentBody")!);
  if (node.type === "root" && children.length === 1) return value(children[0]!);
  throw new Error("CAT_CONTRACT_UNSUPPORTED_YAML");
}
interface Spec {
  openapi: string;
  components: { schemas: Record<string, unknown> };
  paths: Record<string, unknown>;
}
export async function contracts() {
  const text = readFileSync(
    "../../docs/05-engineering/contracts/openapi/atlas-commerce-api-v1.yaml",
    "utf8",
  );
  const parser = parsers.yaml!;
  const ast = await parser.parse(text, { parser: "yaml" } as Parameters<
    typeof parser.parse
  >[1]);
  const spec = value(ast as Node) as Spec;
  if (spec.openapi !== "3.1.0") throw new Error("CAT_OPENAPI_VERSION_INVALID");
  let refs = 0;
  function walk(v: unknown) {
    if (!v || typeof v !== "object") return;
    if ("$ref" in v) {
      if (typeof v.$ref !== "string" || !v.$ref.startsWith("#/"))
        throw new Error("CAT_EXTERNAL_REF_REJECTED");
      let resolved: unknown = spec;
      for (const part of v.$ref.slice(2).split("/")) {
        const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
        if (
          !resolved ||
          typeof resolved !== "object" ||
          !Object.hasOwn(resolved, key)
        )
          throw new Error("CAT_REF_MISSING");
        resolved = (resolved as Record<string, unknown>)[key];
      }
      refs++;
    }
    for (const child of Object.values(v)) walk(child);
  }
  walk(spec);
  const cli = createRequire(import.meta.resolve("@nestjs/cli/package.json"));
  const core = createRequire(cli.resolve("@angular-devkit/core"));
  type Validate = ((input: unknown) => boolean) & { errors?: unknown };
  const Ajv = core("ajv/dist/2020.js").default as new (options: unknown) => {
    compile(schema: unknown): Validate;
  };
  const validator = new Ajv({
    strict: false,
    validateFormats: false,
    allErrors: true,
  });
  const product = validator.compile({
    $ref: "#/components/schemas/ProductSummary",
    components: spec.components,
  });
  const list = validator.compile({
    $ref: "#/components/schemas/ProductList",
    components: spec.components,
  });
  return { product, list, refs, spec };
}
