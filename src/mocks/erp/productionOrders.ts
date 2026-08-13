export type ProductionOrder = {
  id: string;
  number: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  quantityPlanned: number;
  quantityProduced: number;
  quantityRejected: number;
  rawMaterialPlanned: string;
  rawMaterialUsed: string;
  operator: string;
  machine: string;
  startDate: string;
  endDate: string | null;
  progressPct: number;
  status: "planejada" | "em_producao" | "atrasada" | "concluida" | "cancelada";
  notes: string;
};

const PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: "op-3391", number: "OP-3391", orderNumber: "PED-2210", customerName: "Indústria Ferraz Ltda", productName: "Suporte de dobradiça reforçado", quantityPlanned: 2000, quantityProduced: 2000, quantityRejected: 0, rawMaterialPlanned: "420 kg de aço 2mm", rawMaterialUsed: "418 kg de aço 2mm", operator: "Antônio Ribeiro Neto", machine: "Prensa 03", startDate: "2026-07-28", endDate: "2026-07-30", progressPct: 100, status: "concluida", notes: "Lote finalizado sem rejeição relevante." },
  { id: "op-3392", number: "OP-3392", orderNumber: "PED-2214", customerName: "Comércio Aliança MB", productName: "Perfil injetado padrão 40cm", quantityPlanned: 5000, quantityProduced: 3100, quantityRejected: 40, rawMaterialPlanned: "800 kg de polímero", rawMaterialUsed: "510 kg de polímero", operator: "Wesley dos Santos", machine: "Injetora 01", startDate: "2026-08-05", endDate: null, progressPct: 62, status: "em_producao", notes: "Dentro do prazo previsto." },
  { id: "op-3393", number: "OP-3393", orderNumber: "PED-2219", customerName: "Distribuidora Rio Sul", productName: "Caixa de papelão reforçada M", quantityPlanned: 12000, quantityProduced: 12000, quantityRejected: 85, rawMaterialPlanned: "1.100 kg de papelão", rawMaterialUsed: "1.140 kg de papelão", operator: "Antônio Ribeiro Neto", machine: "Linha de corte 02", startDate: "2026-08-01", endDate: "2026-08-04", progressPct: 100, status: "concluida", notes: "Rejeição um pouco acima do previsto." },
  { id: "op-3394", number: "OP-3394", orderNumber: "PED-2221", customerName: "Metalúrgica Bragança", productName: "Parafuso M8 inox sextavado", quantityPlanned: 8000, quantityProduced: 1900, quantityRejected: 12, rawMaterialPlanned: "300 kg de inox", rawMaterialUsed: "78 kg de inox", operator: "Wesley dos Santos", machine: "Torno CNC 02", startDate: "2026-08-03", endDate: null, progressPct: 24, status: "atrasada", notes: "Parada não programada da máquina em 06/08." },
  { id: "op-3395", number: "OP-3395", orderNumber: "PED-2225", customerName: "Armazém Central Alimentos", productName: "Filme PVC industrial 30cm", quantityPlanned: 3000, quantityProduced: 0, quantityRejected: 0, rawMaterialPlanned: "400 kg de PVC", rawMaterialUsed: "—", operator: "A definir", machine: "Extrusora 01", startDate: "2026-08-14", endDate: null, progressPct: 0, status: "planejada", notes: "Aguardando liberação de matéria-prima." },
  { id: "op-3396", number: "OP-3396", orderNumber: "PED-2227", customerName: "Auto Peças Vitória", productName: "Tampão de borracha padrão M", quantityPlanned: 4500, quantityProduced: 4500, quantityRejected: 20, rawMaterialPlanned: "180 kg de borracha", rawMaterialUsed: "183 kg de borracha", operator: "Sueli Aparecida Gomes", machine: "Injetora 02", startDate: "2026-07-20", endDate: "2026-07-23", progressPct: 100, status: "concluida", notes: "" },
  { id: "op-3397", number: "OP-3397", orderNumber: "PED-2230", customerName: "Têxtil Nordeste S.A.", productName: "Etiqueta térmica 100x50mm", quantityPlanned: 20000, quantityProduced: 6400, quantityRejected: 15, rawMaterialPlanned: "50 rolos de papel térmico", rawMaterialUsed: "16 rolos de papel térmico", operator: "Antônio Ribeiro Neto", machine: "Impressora industrial 01", startDate: "2026-08-08", endDate: null, progressPct: 32, status: "em_producao", notes: "" },
  { id: "op-3398", number: "OP-3398", orderNumber: "PED-2233", customerName: "Papelaria Escreva Bem", productName: "Cabo elétrico flexível 2,5mm 2m", quantityPlanned: 3500, quantityProduced: 800, quantityRejected: 4, rawMaterialPlanned: "700 m de fio de cobre", rawMaterialUsed: "165 m de fio de cobre", operator: "Wesley dos Santos", machine: "Linha de montagem 03", startDate: "2026-08-02", endDate: null, progressPct: 23, status: "atrasada", notes: "Falta de insumo represou a produção." },
  { id: "op-3399", number: "OP-3399", orderNumber: "PED-2236", customerName: "Móveis Planejados Vitral", productName: "Resina de poliuretano 500ml", quantityPlanned: 1200, quantityProduced: 0, quantityRejected: 0, rawMaterialPlanned: "600 kg de resina base", rawMaterialUsed: "—", operator: "A definir", machine: "Linha química 01", startDate: "2026-08-18", endDate: null, progressPct: 0, status: "planejada", notes: "" },
  { id: "op-3400", number: "OP-3400", orderNumber: "PED-2240", customerName: "Grupo Eletro Salvador", productName: "Chapa de aço 2mm 1000x2000mm", quantityPlanned: 600, quantityProduced: 600, quantityRejected: 3, rawMaterialPlanned: "1.200 kg de aço bruto", rawMaterialUsed: "1.190 kg de aço bruto", operator: "Sueli Aparecida Gomes", machine: "Prensa 01", startDate: "2026-07-15", endDate: "2026-07-18", progressPct: 100, status: "concluida", notes: "" },
];

export function getMockProductionOrders(): ProductionOrder[] {
  return PRODUCTION_ORDERS;
}

export function getMockProductionOrderById(id: string): ProductionOrder | undefined {
  return PRODUCTION_ORDERS.find((o) => o.id === id);
}
