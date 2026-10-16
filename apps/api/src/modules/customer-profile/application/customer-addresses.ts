import {
  principal,
  cpUuid,
  postal,
  ProfileError,
  type AuthorizedCustomerPrincipal,
  type CandidatePostalAddress,
  type AddressEligibility,
  type AddressSnapshot,
  type QuoteAddress,
} from "../domain/address.js";
export interface CustomerPrincipalSource {
  current(): Promise<AuthorizedCustomerPrincipal>;
}
// Opaque and active only during the adapter's transaction callback; never browser input.
export interface ProfileTransactionContext {
  readonly purpose: "CP-01_TEST_ONLY";
}
export interface AuthorizedDeliveryAddress {
  readForQuote(
    p: AuthorizedCustomerPrincipal,
    id: string,
  ): Promise<QuoteAddress>;
  snapshotForOrder(
    p: AuthorizedCustomerPrincipal,
    id: string,
    version: number,
    tx: ProfileTransactionContext,
  ): Promise<AddressSnapshot>;
}
export interface ProfileStore extends AuthorizedDeliveryAddress {
  change(
    p: AuthorizedCustomerPrincipal,
    key: string,
    id: string,
    version: number,
    address: CandidatePostalAddress,
    state: AddressEligibility,
  ): Promise<AddressSnapshot>;
  transaction<T>(
    p: AuthorizedCustomerPrincipal,
    work: (tx: ProfileTransactionContext) => Promise<T>,
  ): Promise<T>;
  close(): Promise<void>;
}
export class CustomerAddresses {
  constructor(
    private readonly store: ProfileStore,
    private readonly identity: CustomerPrincipalSource,
  ) {}
  private async actor() {
    return principal(await this.identity.current());
  }
  async change(
    key: string,
    id: string,
    version: number,
    address: CandidatePostalAddress,
    state: AddressEligibility,
  ) {
    if (
      !cpUuid.test(key) ||
      !cpUuid.test(id) ||
      !Number.isSafeInteger(version) ||
      version < 0 ||
      !["ELIGIBLE", "INELIGIBLE", "RETIRED"].includes(state)
    )
      throw new ProfileError("INVALID_REQUEST");
    return this.store.change(
      await this.actor(),
      key,
      id,
      version,
      postal(address),
      state,
    );
  }
  async readForQuote(id: string) {
    if (!cpUuid.test(id)) throw new ProfileError("RESOURCE_NOT_FOUND");
    return this.store.readForQuote(await this.actor(), id);
  }
  async snapshotForOrder<T>(
    id: string,
    version: number,
    accept: (snapshot: AddressSnapshot) => Promise<T>,
  ) {
    if (!cpUuid.test(id) || !Number.isSafeInteger(version) || version < 1)
      throw new ProfileError("RESOURCE_NOT_FOUND");
    const p = await this.actor();
    return this.store.transaction(p, async (tx) =>
      accept(await this.store.snapshotForOrder(p, id, version, tx)),
    );
  }
  close() {
    return this.store.close();
  }
}
