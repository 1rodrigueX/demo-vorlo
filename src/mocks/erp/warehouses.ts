export type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  itemsCount: number;
  status: "ativo" | "inativo";
};

const WAREHOUSES: Warehouse[] = [
  { id: "wh-01", name: "Depósito Central", address: "Rod. BR-101, Km 22, s/n", city: "Feira de Santana", state: "BA", itemsCount: 4210, status: "ativo" },
  { id: "wh-02", name: "Depósito Insumos", address: "Rua das Indústrias, 340", city: "Feira de Santana", state: "BA", itemsCount: 890, status: "ativo" },
  { id: "wh-03", name: "Depósito Embalagens", address: "Av. do Contorno, 1180", city: "Feira de Santana", state: "BA", itemsCount: 1560, status: "ativo" },
  { id: "wh-04", name: "Depósito Filial Salvador", address: "Rua Miguel Calmon, 520", city: "Salvador", state: "BA", itemsCount: 0, status: "inativo" },
];

export function getMockWarehouses(): Warehouse[] {
  return WAREHOUSES;
}
