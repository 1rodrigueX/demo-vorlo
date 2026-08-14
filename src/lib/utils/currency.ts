export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** BRL compacto (ex: "R$ 12,3 mil") — usado nos eixos de gráfico, onde o
 * valor completo não cabe. */
export function formatCurrencyCompact(value: number) {
  return compactCurrencyFormatter.format(value);
}
