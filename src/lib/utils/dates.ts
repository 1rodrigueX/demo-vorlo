import { formatDistanceToNow, format, isToday, isYesterday, isSameDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatRelative(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function formatDateTime(date: string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatTime(date: string) {
  return format(new Date(date), "HH:mm", { locale: ptBR });
}

export function formatDayDivider(date: string) {
  const d = new Date(date);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function isSameCalendarDay(a: string, b: string) {
  return isSameDay(new Date(a), new Date(b));
}

export function daysSinceNow(date: string) {
  return differenceInDays(new Date(), new Date(date));
}
