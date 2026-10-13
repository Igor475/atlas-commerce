export const BOOTSTRAP_STATUS = "SKELETON_ONLY" as const;

export interface BootstrapStatus {
  readonly status: typeof BOOTSTRAP_STATUS;
}
