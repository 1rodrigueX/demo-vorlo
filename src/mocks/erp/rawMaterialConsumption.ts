export type RawMaterialConsumption = {
  id: string;
  opNumber: string;
  materialName: string;
  plannedQty: string;
  usedQty: string;
  wastePct: number;
  date: string;
};

const RAW_MATERIAL_CONSUMPTION: RawMaterialConsumption[] = [
  { id: "cns-01", opNumber: "OP-3391", materialName: "Aço 2mm", plannedQty: "420 kg", usedQty: "418 kg", wastePct: -0.5, date: "2026-07-30" },
  { id: "cns-02", opNumber: "OP-3392", materialName: "Polímero", plannedQty: "800 kg", usedQty: "510 kg", wastePct: 0, date: "2026-08-12" },
  { id: "cns-03", opNumber: "OP-3393", materialName: "Papelão", plannedQty: "1.100 kg", usedQty: "1.140 kg", wastePct: 3.6, date: "2026-08-04" },
  { id: "cns-04", opNumber: "OP-3394", materialName: "Inox", plannedQty: "300 kg", usedQty: "78 kg", wastePct: 0, date: "2026-08-11" },
  { id: "cns-05", opNumber: "OP-3396", materialName: "Borracha", plannedQty: "180 kg", usedQty: "183 kg", wastePct: 1.7, date: "2026-07-23" },
  { id: "cns-06", opNumber: "OP-3397", materialName: "Papel térmico", plannedQty: "50 rolos", usedQty: "16 rolos", wastePct: 0, date: "2026-08-12" },
  { id: "cns-07", opNumber: "OP-3398", materialName: "Fio de cobre", plannedQty: "700 m", usedQty: "165 m", wastePct: 0, date: "2026-08-11" },
  { id: "cns-08", opNumber: "OP-3400", materialName: "Aço bruto", plannedQty: "1.200 kg", usedQty: "1.190 kg", wastePct: -0.8, date: "2026-07-18" },
];

export function getMockRawMaterialConsumption(): RawMaterialConsumption[] {
  return RAW_MATERIAL_CONSUMPTION;
}
