const moneyFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** $1.240 */
export const formatMoney = (n) => `$${moneyFmt.format(n)}`;
