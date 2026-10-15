import type { QueryResult } from "pg";
import { exact, fail, type Operation } from "./mrd-contract.js";
const boolOid = 16;
const signalKeys = Object.freeze([
  "can_login",
  "elevated_flags",
  "membership",
  "ownership",
  "database_delegation",
  "temp_capability",
  "schema_delegation",
  "non_system_relation_risk",
  "sequence_risk",
  "executable_function_risk",
  "native_volatile_capability",
  "large_object_capability",
  "parameter_acl",
  "default_acl_risk",
]);
const shapes = Object.freeze({
  PING: Object.freeze({ ok: 23 }),
  SERVER_METADATA: Object.freeze({
    database_name: 19,
    effective_role: 19,
    login_role: 19,
    version_num: 23,
    default_readonly: 16,
    tls: 16,
    tls_version: 25,
  }),
  PRIVILEGES_SUMMARY: Object.freeze(
    Object.fromEntries(signalKeys.map((k) => [k, boolOid])),
  ),
  SCHEMA_EXPOSURE_SUMMARY: Object.freeze({
    schema_name: 25,
    present: 16,
    has_relations: 16,
    public_relation_grant: 16,
    api_relation_grant: 16,
    api_roles_present: 16,
  }),
});
export function projectResult(id: Operation, result: QueryResult): unknown {
  const shape = shapes[id];
  const keys = Object.keys(shape);
  if (
    !result ||
    !Array.isArray(result.rows) ||
    !Array.isArray(result.fields) ||
    result.rowCount !== result.rows.length
  )
    fail("MRD_RESULT_INVALID");
  if (
    result.command !== "SELECT" ||
    result.rows.length !== (id === "SCHEMA_EXPOSURE_SUMMARY" ? 2 : 1) ||
    result.fields.length !== keys.length ||
    result.fields.some(
      (f, i) =>
        f.name !== keys[i] ||
        f.dataTypeID !== (shape as Record<string, number>)[f.name],
    )
  )
    fail("MRD_RESULT_INVALID");
  for (const row of result.rows) exact(row, keys);
  const r: Record<string, unknown> = result.rows[0];
  if (id === "PING") {
    if (r.ok !== 1) fail("MRD_RESULT_INVALID");
    return { reachable: true };
  }
  if (id === "SERVER_METADATA") {
    if (
      r.database_name !== "atlas_mrd_g2" ||
      r.effective_role !== "atlas_mrd_local" ||
      r.login_role !== "atlas_mrd_local"
    )
      fail("MRD_IDENTITY_REJECTED");
    if (
      !Number.isInteger(r.version_num) ||
      Number(r.version_num) < 170000 ||
      Number(r.version_num) > 179999 ||
      r.default_readonly !== true
    )
      fail("MRD_IDENTITY_REJECTED");
    if (
      r.tls !== true ||
      typeof r.tls_version !== "string" ||
      !["TLSv1.2", "TLSv1.3"].includes(r.tls_version)
    )
      fail("MRD_TLS_REJECTED");
    return {
      serverMajor: 17,
      identityMatched: true,
      defaultReadonly: true,
      tls: true,
      tlsVersion: r.tls_version,
    };
  }
  if (id === "PRIVILEGES_SUMMARY") {
    if (signalKeys.some((k) => typeof r[k] !== "boolean"))
      fail("MRD_RESULT_INVALID");
    if (
      r.can_login !== true ||
      signalKeys.some(
        (k) =>
          ![
            "can_login",
            "temp_capability",
            "native_volatile_capability",
            "large_object_capability",
          ].includes(k) && r[k] !== false,
      )
    )
      fail("MRD_IDENTITY_REJECTED");
    return {
      signals: Object.fromEntries(signalKeys.map((k) => [k, r[k]])),
      coverage: "LIMITED_CATALOG_SIGNALS",
      sqlCredentialStrictReadonly: "NOT_PROVEN",
    };
  }
  const schemas = result.rows.map((row: Record<string, unknown>, i) => {
    if (row.api_roles_present !== result.rows[0].api_roles_present)
      fail("MRD_RESULT_INVALID");
    if (
      row.schema_name !== ["identity", "public"][i] ||
      typeof row.present !== "boolean" ||
      typeof row.api_roles_present !== "boolean"
    )
      fail("MRD_RESULT_INVALID");
    for (const k of [
      "has_relations",
      "public_relation_grant",
      "api_relation_grant",
    ]) {
      const unknown =
        row.present === false ||
        (k === "api_relation_grant" && row.api_roles_present === false);
      if (unknown ? row[k] !== null : typeof row[k] !== "boolean")
        fail("MRD_RESULT_INVALID");
    }
    if (
      row.schema_name === "identity" &&
      row.present &&
      (row.public_relation_grant ||
        row.api_relation_grant ||
        !row.api_roles_present)
    )
      fail("MRD_EXPOSURE_REVIEW_REQUIRED");
    return Object.fromEntries(keys.map((k) => [k, row[k]]));
  });
  return {
    schemas,
    dataApiEvidence: "UNVERIFIED",
    coverage: result.rows[0].api_roles_present
      ? "CATALOG_ONLY_API_ROLES_PRESENT"
      : "CATALOG_ONLY_API_ROLES_MISSING",
  };
}
