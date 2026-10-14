export type CustomerStatus =
  "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export type TokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";
export type IdentityCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CSRF_INVALID"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE";
export class IdentityError extends Error {
  constructor(
    readonly code: IdentityCode,
    readonly retryAfter?: number,
  ) {
    super(code);
  }
}
export interface CustomerView {
  id: string;
  email: string;
  sessionClass: "CUSTOMER";
}
export interface Credential {
  id: string;
  hash: string;
  status: CustomerStatus;
  version: number;
}
export interface EmailMessage {
  email: string;
  token: string;
  purpose: TokenPurpose;
}
export interface MailIntent {
  id: string;
  attempts: number;
  payload: string;
}
export interface IdentityCrypto {
  random(): string;
  digest(purpose: string, value: string): string;
  password(value: string): Promise<string>;
  verify(
    value: string,
    hash?: string,
  ): Promise<{ matches: boolean; upgrade: boolean }>;
  seal(message: EmailMessage): string;
  open(payload: string): EmailMessage;
}
export interface IdentityMail {
  send(idempotencyKey: string, message: EmailMessage): Promise<void>;
}
export interface IssueToken {
  hash: string;
  payload: string;
  ttl: number;
  purpose: TokenPurpose;
}
export interface IdentityRepository {
  register(
    email: string,
    hash: string,
    token: IssueToken,
    requestId: string,
  ): Promise<void>;
  issue(email: string, token: IssueToken, requestId: string): Promise<void>;
  verifyToken(hash: string, requestId: string): Promise<boolean>;
  failure(
    action: "LOGIN_DENIED" | "VERIFY_DENIED" | "RECOVERY_DENIED",
    requestId: string,
  ): Promise<void>;
  credential(email: string): Promise<Credential | undefined>;
  login(
    credential: Credential,
    tokenHash: string,
    oldHash: string,
    newHash: string | undefined,
    origin: string,
    absolute: number,
    requestId: string,
  ): Promise<boolean>;
  current(
    tokenHash: string,
    origin: string,
    idle: number,
  ): Promise<CustomerView | undefined>;
  revoke(
    tokenHash: string,
    all: boolean,
    origin: string,
    idle: number,
    requestId: string,
  ): Promise<void>;
  recover(
    tokenHash: string,
    passwordHash: string,
    requestId: string,
  ): Promise<boolean>;
  limit(
    key: string,
    seconds: number,
    maximum: number,
  ): Promise<number | undefined>;
  claimMail(): Promise<MailIntent | undefined>;
  finishMail(id: string, delivered: boolean, attempt: number): Promise<void>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}
