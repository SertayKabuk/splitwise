export const CURRENCIES = {
  TRY: { symbol: "₺", name: "Turkish Lira" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  NOK: { symbol: "kr", name: "Norwegian Krone" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatAmount(amount: number, currency: CurrencyCode): string {
  const { symbol } = CURRENCIES[currency];
  if (currency === "NOK") return `${amount.toFixed(2)} ${symbol}`;
  return `${symbol}${amount.toFixed(2)}`;
}
