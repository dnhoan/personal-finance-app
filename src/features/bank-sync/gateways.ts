// Datalist suggestions for the bank field. Deliberately a hint, not a
// constraint: SePay's supported-bank roster changes, and the field accepts free
// text so a newly supported bank never requires a code change. What matters for
// matching is that the value equals what SePay sends in `gateway`.
export const COMMON_GATEWAYS = [
  "Vietcombank",
  "MBBank",
  "ACB",
  "TPBank",
  "BIDV",
  "VPBank",
  "OCB",
  "MSB",
  "KienLongBank",
  "Techcombank",
  "VietinBank",
  "Sacombank",
  "Agribank",
  "HDBank",
  "SHB",
  "VIB",
] as const;
