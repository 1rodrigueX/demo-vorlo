export type ProductionAppointment = {
  id: string;
  opNumber: string;
  date: string;
  shift: "Manhã" | "Tarde" | "Noite";
  operator: string;
  machine: string;
  quantityProduced: number;
  quantityRejected: number;
};

const PRODUCTION_APPOINTMENTS: ProductionAppointment[] = [
  { id: "apt-01", opNumber: "OP-3392", date: "2026-08-12", shift: "Manhã", operator: "Wesley dos Santos", machine: "Injetora 01", quantityProduced: 620, quantityRejected: 8 },
  { id: "apt-02", opNumber: "OP-3392", date: "2026-08-12", shift: "Tarde", operator: "Wesley dos Santos", machine: "Injetora 01", quantityProduced: 580, quantityRejected: 5 },
  { id: "apt-03", opNumber: "OP-3397", date: "2026-08-12", shift: "Manhã", operator: "Antônio Ribeiro Neto", machine: "Impressora industrial 01", quantityProduced: 1200, quantityRejected: 3 },
  { id: "apt-04", opNumber: "OP-3394", date: "2026-08-11", shift: "Tarde", operator: "Wesley dos Santos", machine: "Torno CNC 02", quantityProduced: 210, quantityRejected: 2 },
  { id: "apt-05", opNumber: "OP-3398", date: "2026-08-11", shift: "Noite", operator: "Wesley dos Santos", machine: "Linha de montagem 03", quantityProduced: 140, quantityRejected: 1 },
  { id: "apt-06", opNumber: "OP-3393", date: "2026-08-03", shift: "Manhã", operator: "Antônio Ribeiro Neto", machine: "Linha de corte 02", quantityProduced: 4100, quantityRejected: 30 },
  { id: "apt-07", opNumber: "OP-3391", date: "2026-07-29", shift: "Tarde", operator: "Antônio Ribeiro Neto", machine: "Prensa 03", quantityProduced: 1050, quantityRejected: 0 },
];

export function getMockProductionAppointments(): ProductionAppointment[] {
  return PRODUCTION_APPOINTMENTS;
}
