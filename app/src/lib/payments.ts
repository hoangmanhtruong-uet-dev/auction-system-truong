export function assertRealMoneyPaymentsEnabled(
  source: Record<string, string | undefined> = process.env,
): void {
  if (source.REAL_MONEY_PAYMENTS_ENABLED !== "true") {
    throw new Error("REAL_MONEY_PAYMENTS_DISABLED");
  }
}
