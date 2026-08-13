export type Customer = {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  segment: string;
  status: "ativo" | "inativo";
  salesTotal: number;
  createdAt: string;
};

const CUSTOMERS: Customer[] = [
  { id: "cli-01", name: "Indústria Ferraz Ltda", document: "12.345.678/0001-90", email: "compras@ferraz.ind.br", phone: "(11) 4002-8922", city: "São Paulo", state: "SP", segment: "Indústria", status: "ativo", salesTotal: 184500, createdAt: "2024-02-14" },
  { id: "cli-02", name: "Comércio Aliança MB", document: "98.765.432/0001-10", email: "financeiro@aliancamb.com.br", phone: "(31) 3222-1188", city: "Belo Horizonte", state: "MG", segment: "Varejo", status: "ativo", salesTotal: 92300, createdAt: "2024-05-02" },
  { id: "cli-03", name: "Distribuidora Rio Sul", document: "23.456.789/0001-21", email: "pedidos@riosul.com.br", phone: "(21) 2555-9090", city: "Rio de Janeiro", state: "RJ", segment: "Distribuição", status: "ativo", salesTotal: 231750, createdAt: "2023-11-20" },
  { id: "cli-04", name: "Metalúrgica Bragança", document: "34.567.890/0001-32", email: "contato@braganca.ind.br", phone: "(11) 4033-7710", city: "Bragança Paulista", state: "SP", segment: "Indústria", status: "ativo", salesTotal: 67200, createdAt: "2024-07-09" },
  { id: "cli-05", name: "Construtora Horizonte", document: "45.678.901/0001-43", email: "suprimentos@horizonte.eng.br", phone: "(41) 3350-4020", city: "Curitiba", state: "PR", segment: "Construção civil", status: "inativo", salesTotal: 15400, createdAt: "2023-08-30" },
  { id: "cli-06", name: "Armazém Central Alimentos", document: "56.789.012/0001-54", email: "compras@armazemcentral.com.br", phone: "(51) 3221-6600", city: "Porto Alegre", state: "RS", segment: "Alimentício", status: "ativo", salesTotal: 143900, createdAt: "2024-01-18" },
  { id: "cli-07", name: "Auto Peças Vitória", document: "67.890.123/0001-65", email: "financeiro@apvitoria.com.br", phone: "(27) 3345-2211", city: "Vitória", state: "ES", segment: "Autopeças", status: "ativo", salesTotal: 58900, createdAt: "2024-03-25" },
  { id: "cli-08", name: "Têxtil Nordeste S.A.", document: "78.901.234/0001-76", email: "compras@textilnordeste.com.br", phone: "(85) 3266-1090", city: "Fortaleza", state: "CE", segment: "Têxtil", status: "ativo", salesTotal: 201300, createdAt: "2023-09-11" },
  { id: "cli-09", name: "Farmacêutica Nova Vida", document: "89.012.345/0001-87", email: "juridico@novavida.com.br", phone: "(62) 3211-4455", city: "Goiânia", state: "GO", segment: "Farmacêutico", status: "inativo", salesTotal: 8700, createdAt: "2022-12-05" },
  { id: "cli-10", name: "Papelaria Escreva Bem", document: "90.123.456/0001-98", email: "pedidos@escrevabem.com.br", phone: "(19) 3234-9900", city: "Campinas", state: "SP", segment: "Papelaria", status: "ativo", salesTotal: 34600, createdAt: "2024-06-14" },
  { id: "cli-11", name: "Móveis Planejados Vitral", document: "01.234.567/0001-09", email: "compras@vitralmoveis.com.br", phone: "(48) 3222-7788", city: "Florianópolis", state: "SC", segment: "Móveis", status: "ativo", salesTotal: 119800, createdAt: "2024-04-03" },
  { id: "cli-12", name: "Grupo Eletro Salvador", document: "12.345.098/0001-11", email: "financeiro@eletrosalvador.com.br", phone: "(71) 3288-3300", city: "Salvador", state: "BA", segment: "Eletroeletrônico", status: "ativo", salesTotal: 176400, createdAt: "2023-10-27" },
];

export function getMockCustomers(): Customer[] {
  return CUSTOMERS;
}

export function getMockCustomerById(id: string): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id);
}
