// SPDX-License-Identifier: MIT
//
// Runtime validator for upstream data against a language's published
// schema.json. Used by the DATA visitor when its argument came from `use`
// (i.e. the rewriting walker has inlined the schema as JSON on the USE
// node's STR child, the USE visitor parsed it back, and tagged the
// resulting record with `_gcSchema`).
//
// Compiled Ajv validators are cached on this module by schema $id (or a
// content fingerprint as fallback). Schemas inlined by the walker are
// stable per item, so the cache amortizes nicely across requests.

import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = new Map();

function fingerprint(schema) {
  if (schema && typeof schema === "object" && typeof schema.$id === "string") {
    return schema.$id;
  }
  try {
    return JSON.stringify(schema);
  } catch (_) {
    return null;
  }
}

export function validateAgainstSchema(value, schema) {
  const key = fingerprint(schema);
  let validate = key && compiled.get(key);
  if (!validate) {
    validate = ajv.compile(schema);
    if (key) compiled.set(key, validate);
  }
  if (validate(value)) return [];
  const title = schema?.title || schema?.$id || "schema";
  return (validate.errors || []).map((e) => ({
    message: `upstream data does not match ${title}: ${e.instancePath || "(root)"} ${e.message}`,
    from: -1,
    to: -1,
  }));
}
