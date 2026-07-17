/** Soma um mês de calendário (dia 31 vira o último dia do mês seguinte se ele não existir). */
export function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}
