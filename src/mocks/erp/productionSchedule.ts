export type ProductionScheduleItem = {
  id: string;
  opNumber: string;
  productName: string;
  machine: string;
  plannedStart: string;
  plannedEnd: string;
  priority: "baixa" | "media" | "alta";
  status: "planejada" | "em_producao" | "atrasada" | "concluida" | "cancelada";
};

const PRODUCTION_SCHEDULE: ProductionScheduleItem[] = [
  { id: "sch-01", opNumber: "OP-3395", productName: "Filme PVC industrial 30cm", machine: "Extrusora 01", plannedStart: "2026-08-14", plannedEnd: "2026-08-17", priority: "media", status: "planejada" },
  { id: "sch-02", opNumber: "OP-3399", productName: "Resina de poliuretano 500ml", machine: "Linha química 01", plannedStart: "2026-08-18", plannedEnd: "2026-08-21", priority: "baixa", status: "planejada" },
  { id: "sch-03", opNumber: "OP-3392", productName: "Perfil injetado padrão 40cm", machine: "Injetora 01", plannedStart: "2026-08-05", plannedEnd: "2026-08-15", priority: "alta", status: "em_producao" },
  { id: "sch-04", opNumber: "OP-3397", productName: "Etiqueta térmica 100x50mm", machine: "Impressora industrial 01", plannedStart: "2026-08-08", plannedEnd: "2026-08-16", priority: "media", status: "em_producao" },
  { id: "sch-05", opNumber: "OP-3394", productName: "Parafuso M8 inox sextavado", machine: "Torno CNC 02", plannedStart: "2026-08-03", plannedEnd: "2026-08-10", priority: "alta", status: "atrasada" },
  { id: "sch-06", opNumber: "OP-3398", productName: "Cabo elétrico flexível 2,5mm 2m", machine: "Linha de montagem 03", plannedStart: "2026-08-02", plannedEnd: "2026-08-09", priority: "alta", status: "atrasada" },
  { id: "sch-07", opNumber: "OP-3401", productName: "Suporte de dobradiça reforçado", machine: "Prensa 03", plannedStart: "2026-08-20", plannedEnd: "2026-08-24", priority: "media", status: "planejada" },
];

export function getMockProductionSchedule(): ProductionScheduleItem[] {
  return PRODUCTION_SCHEDULE;
}
