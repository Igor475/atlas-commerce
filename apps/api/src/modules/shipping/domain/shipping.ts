import {
  quoteProjection,
  quoteUuid,
  type QuoteResult,
} from "../../quotes/domain/quote.js";
import { validateProjection } from "../../orders/domain/preparation.js";
import {
  IntegrationError,
  type IntegratedPreparation,
} from "../../customer-profile/application/profile-order-integration.js";

// Internal TEST_ONLY evidence. Not the proposed public QuoteResult/estimate contract.
export interface ShippingTerms {
  purpose: "TEST_ONLY";
  policyId: string;
  policyVersion: number;
  zoneId: string;
  option: string;
  currency: "BRL";
  amountCents: number;
  addressId: string;
  addressVersion: number;
  country: "BR";
  postalCode: string;
  eligibility: {
    purpose: "TEST_ONLY";
    physicalDataComplete: true;
    maxDimensionMm: number;
    kitGrouping: "PC04_PHYSICAL_COMPONENTS_TOGETHER";
    chargeScope: "ORDER";
  };
  estimateFixture: {
    purpose: "TEST_ONLY";
    min: number;
    max: number;
    unit: "TEST_ONLY_UNAPPROVED_UNIT";
  } | null;
}
export interface ShippingQuote extends QuoteResult {
  subtotal: { currency: "BRL"; amountCents: number };
  delivery: ShippingTerms | null;
}
export interface ShippingPreparation extends IntegratedPreparation {
  delivery: ShippingTerms | null;
  total: { currency: "BRL"; amountCents: number };
}
function unavailable(): never {
  throw new IntegrationError("INTEGRATION_UNAVAILABLE");
}
function cents(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}
function terms(t: ShippingTerms | null) {
  if (t === null) return;
  if (
    !t ||
    t.purpose !== "TEST_ONLY" ||
    t.currency !== "BRL" ||
    !cents(t.amountCents) ||
    !quoteUuid.test(t.policyId) ||
    !quoteUuid.test(t.zoneId) ||
    !quoteUuid.test(t.addressId) ||
    !Number.isInteger(t.policyVersion) ||
    t.policyVersion < 1 ||
    !Number.isInteger(t.addressVersion) ||
    t.addressVersion < 1 ||
    !/^TEST_[A-Z_]{1,40}$/.test(t.option) ||
    t.country !== "BR" ||
    !/^[0-9]{8}$/.test(t.postalCode) ||
    t.eligibility?.purpose !== "TEST_ONLY" ||
    t.eligibility.physicalDataComplete !== true ||
    t.eligibility.chargeScope !== "ORDER" ||
    t.eligibility.kitGrouping !== "PC04_PHYSICAL_COMPONENTS_TOGETHER" ||
    !Number.isInteger(t.eligibility.maxDimensionMm) ||
    t.eligibility.maxDimensionMm < 1
  )
    unavailable();
  const e = t.estimateFixture;
  if (
    e !== null &&
    (!e ||
      e.purpose !== "TEST_ONLY" ||
      e.unit !== "TEST_ONLY_UNAPPROVED_UNIT" ||
      !Number.isInteger(e.min) ||
      !Number.isInteger(e.max) ||
      e.min < 1 ||
      e.max < e.min ||
      e.max > 100)
  )
    unavailable();
}
export function shippingQuote(value: QuoteResult): ShippingQuote {
  quoteProjection(value);
  const q = value as ShippingQuote;
  if (
    !Object.hasOwn(q, "delivery") ||
    q.subtotal?.currency !== "BRL" ||
    !cents(q.subtotal.amountCents)
  )
    unavailable();
  terms(q.delivery);
  const sum = q.subtotal.amountCents + (q.delivery?.amountCents ?? 0);
  if (!Number.isSafeInteger(sum) || sum !== q.total.amountCents) unavailable();
  return q;
}
export function shippingPreparation(
  value: IntegratedPreparation,
): ShippingPreparation {
  validateProjection(value.preparation);
  const p = value as ShippingPreparation;
  if (
    !Object.hasOwn(p, "delivery") ||
    p.total?.currency !== "BRL" ||
    !cents(p.total.amountCents)
  )
    unavailable();
  terms(p.delivery);
  if (
    (p.delivery === null) !== (p.addressSnapshot === null) ||
    (p.delivery === null) !== (p.preparation.reservationExpiresAt === null)
  )
    unavailable();
  if (
    p.delivery &&
    (p.delivery.addressId !== p.addressSnapshot?.addressId ||
      p.delivery.addressVersion !== p.addressSnapshot?.addressVersion)
  )
    unavailable();
  if (
    p.preparation.baseSubtotal.amountCents + (p.delivery?.amountCents ?? 0) !==
    p.total.amountCents
  )
    unavailable();
  return p;
}
