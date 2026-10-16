export const cpUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export class ProfileError extends Error {
  constructor(
    readonly code:
      | "INVALID_REQUEST"
      | "UNAUTHENTICATED"
      | "RESOURCE_NOT_FOUND"
      | "VERSION_CONFLICT"
      | "IDEMPOTENCY_CONFLICT"
      | "PROFILE_UNAVAILABLE",
  ) {
    super(code);
  }
}
// Candidate laboratory fields only. No commercial postal completeness/CEP authority.
export interface CandidatePostalAddress {
  recipient: string;
  country: "BR";
  postalCode: string;
  region: string;
  city: string;
  district: string;
  street: string;
  number: string;
  complement: string | null;
}
export type AddressEligibility = "ELIGIBLE" | "INELIGIBLE" | "RETIRED";
export interface AuthorizedCustomerPrincipal {
  accountId: string;
  sessionClass: "CUSTOMER";
  eligible: true;
  evidence: "CP-01_TEST_ONLY";
}
export interface QuoteAddress {
  addressId: string;
  addressVersion: number;
  country: "BR";
  postalCode: string;
  eligible: true;
}
export interface AddressSnapshot {
  addressId: string;
  addressVersion: number;
  purpose: "TEST_ONLY";
  postalAddress: CandidatePostalAddress;
}
export function principal(value: AuthorizedCustomerPrincipal) {
  if (
    !value ||
    !cpUuid.test(value.accountId) ||
    value.sessionClass !== "CUSTOMER" ||
    value.eligible !== true ||
    value.evidence !== "CP-01_TEST_ONLY"
  )
    throw new ProfileError("UNAUTHENTICATED");
  return value;
}
export function postal(input: CandidatePostalAddress) {
  const fields = [
    "recipient",
    "country",
    "postalCode",
    "region",
    "city",
    "district",
    "street",
    "number",
    "complement",
  ];
  if (
    !input ||
    typeof input !== "object" ||
    Object.keys(input).length !== fields.length ||
    Object.keys(input).some((k) => !fields.includes(k)) ||
    fields.some((k) => !Object.hasOwn(input, k))
  )
    throw new ProfileError("INVALID_REQUEST");
  if (
    input.country !== "BR" ||
    typeof input.postalCode !== "string" ||
    typeof input.region !== "string" ||
    !/^[0-9]{8}$/.test(input.postalCode) ||
    !/^[A-Z]{2}$/.test(input.region) ||
    [
      input.recipient,
      input.city,
      input.district,
      input.street,
      input.number,
    ].some(
      (v) =>
        typeof v !== "string" ||
        v.length < 1 ||
        v.length > 160 ||
        /[\u0000-\u001f\u007f]/.test(v),
    ) ||
    (input.complement !== null &&
      (typeof input.complement !== "string" ||
        input.complement.length > 160 ||
        /[\u0000-\u001f\u007f]/.test(input.complement)))
  )
    throw new ProfileError("INVALID_REQUEST");
  return input;
}
