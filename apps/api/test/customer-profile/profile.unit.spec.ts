import { expect, it } from "vitest";
import {
  cpUuid,
  principal,
  postal,
  type AuthorizedCustomerPrincipal,
  type CandidatePostalAddress,
} from "../../src/modules/customer-profile/domain/address.js";
import {
  profileUrl,
  profileEnabled,
} from "../../src/modules/customer-profile/infrastructure/profile-config.js";
it("Profile accepts canonical UUID and rejects missing group/injection", () => {
  expect(cpUuid.test("00000000-0000-4000-8000-000000000001")).toBe(true);
  expect(cpUuid.test("00000000-0000-4000-000000000001")).toBe(false);
  expect(cpUuid.test("00000000-0000-4000-8000-000000000001' OR 1=1")).toBe(
    false,
  );
});
it("Profile principal refuses missing identity, wrong context and ineligible account", () => {
  for (const value of [
    undefined,
    { accountId: "invalid" },
    {
      accountId: "00000000-0000-4000-8000-000000000001",
      sessionClass: "STAFF",
      eligible: true,
      evidence: "CP-01_TEST_ONLY",
    },
  ])
    expect(() => principal(value as AuthorizedCustomerPrincipal)).toThrow(
      "UNAUTHENTICATED",
    );
});
it("Profile rejects schema-free or excess postal fields", () => {
  expect(() =>
    postal({
      recipient: "TEST",
      country: "BR",
      postalCode: 12345678,
      region: "ZZ",
      city: "TEST",
      district: "TEST",
      street: "TEST",
      number: "TEST",
      complement: null,
    } as unknown as CandidatePostalAddress),
  ).toThrow("INVALID_REQUEST");
  expect(() => postal({ street: "TEST" } as CandidatePostalAddress)).toThrow(
    "INVALID_REQUEST",
  );
});
it("Profile refuses remote/parameterized configuration and stays disabled by default", () => {
  expect(profileEnabled({})).toBe(false);
  expect(() =>
    profileUrl(
      "postgresql://atlas_profile_actor_a@example.invalid:55441/atlas_profile_cp01?schema=customer_profile",
      "CP-01",
    ),
  ).toThrow("PROFILE_LOCAL_REQUIRED");
});
