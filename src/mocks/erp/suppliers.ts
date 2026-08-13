export type Supplier = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  category: string;
  status: "ativo" | "inativo";
};

const SUPPLIERS: Supplier[] = [
  { id: "for-01", name: "Aço Brasil Distribuidora", document: "11.222.333/0001-44", email: "vendas@acobrasil.com.br", phone: "(11) 4522-1000", city: "São Paulo", state: "SP", category: "Matéria-prima", status: "ativo" },
  { id: "for-02", name: "Polímeros Sul Indústria", document: "22.333.444/0001-55", email: "comercial@polimerossul.com.br", phone: "(47) 3322-5500", city: "Joinville", state: "SC", category: "Matéria-prima", status: "ativo" },
  { id: "for-03", name: "Embalagens Rio Grande", document: "33.444.555/0001-66", email: "pedidos@embalagensrg.com.br", phone: "(51) 3011-2200", city: "Porto Alegre", state: "RS", category: "Embalagens", status: "ativo" },
  { id: "for-04", name: "Ferramentaria Precision", document: "44.555.666/0001-77", email: "contato@precisionferr.com.br", phone: "(19) 3878-4400", city: "Sorocaba", state: "SP", category: "Ferramentas", status: "ativo" },
  { id: "for-05", name: "Química Industrial Atlas", document: "55.666.777/0001-88", email: "vendas@atlasquimica.com.br", phone: "(11) 2033-6600", city: "Guarulhos", state: "SP", category: "Insumos químicos", status: "inativo" },
  { id: "for-06", name: "Transportadora Veloz Cargo", document: "66.777.888/0001-99", email: "operacoes@velozcargo.com.br", phone: "(41) 3020-1122", city: "Curitiba", state: "PR", category: "Logística", status: "ativo" },
  { id: "for-07", name: "Componentes Eletrônicos JB", document: "77.888.999/0001-10", email: "vendas@jbcomponentes.com.br", phone: "(31) 3299-8800", city: "Contagem", state: "MG", category: "Componentes", status: "ativo" },
  { id: "for-08", name: "Tintas e Vernizes Colorfix", document: "88.999.000/0001-21", email: "comercial@colorfix.com.br", phone: "(11) 4611-3300", city: "Diadema", state: "SP", category: "Insumos químicos", status: "ativo" },
];

export function getMockSuppliers(): Supplier[] {
  return SUPPLIERS;
}

export function getMockSupplierById(id: string): Supplier | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}
