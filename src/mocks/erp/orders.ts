export type SalesOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type SalesOrder = {
  id: string;
  number: string;
  customerName: string;
  customerDocument: string;
  sellerName: string;
  date: string;
  items: SalesOrderItem[];
  freight: number;
  discount: number;
  deliveryAddress: string;
  paymentTerm: string;
  status: "pendente" | "processando" | "faturado" | "entregue" | "cancelado";
};

function total(o: Omit<SalesOrder, "id" | "status">): number {
  return o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + o.freight - o.discount;
}

const BASE: Omit<SalesOrder, "id" | "status">[] = [
  {
    number: "PED-2240",
    customerName: "Grupo Eletro Salvador",
    customerDocument: "12.345.098/0001-11",
    sellerName: "Bianca Ferreira Reis",
    date: "2026-07-14",
    items: [
      { productName: "Chapa de aço 2mm 1000x2000mm", quantity: 12, unitPrice: 289 },
      { productName: "Parafuso M8 inox sextavado", quantity: 20, unitPrice: 58 },
    ],
    freight: 320,
    discount: 150,
    deliveryAddress: "Av. Tancredo Neves, 1200 — Salvador/BA",
    paymentTerm: "30/60 dias",
  },
  {
    number: "PED-2236",
    customerName: "Móveis Planejados Vitral",
    customerDocument: "01.234.567/0001-09",
    sellerName: "Fernanda Cardoso",
    date: "2026-07-30",
    items: [{ productName: "Resina de poliuretano 500ml", quantity: 40, unitPrice: 72 }],
    freight: 90,
    discount: 0,
    deliveryAddress: "Rua das Palmeiras, 88 — Florianópolis/SC",
    paymentTerm: "À vista",
  },
  {
    number: "PED-2233",
    customerName: "Papelaria Escreva Bem",
    customerDocument: "90.123.456/0001-98",
    sellerName: "Carlos Meneses",
    date: "2026-08-01",
    items: [{ productName: "Cabo elétrico flexível 2,5mm 2m", quantity: 150, unitPrice: 11.2 }],
    freight: 60,
    discount: 30,
    deliveryAddress: "Rua Barão de Jundiaí, 450 — Campinas/SP",
    paymentTerm: "30 dias",
  },
  {
    number: "PED-2230",
    customerName: "Têxtil Nordeste S.A.",
    customerDocument: "78.901.234/0001-76",
    sellerName: "Renata Souza Lima",
    date: "2026-08-05",
    items: [{ productName: "Etiqueta térmica 100x50mm", quantity: 300, unitPrice: 18 }],
    freight: 140,
    discount: 0,
    deliveryAddress: "Rod. BR-116, km 12 — Fortaleza/CE",
    paymentTerm: "45 dias",
  },
  {
    number: "PED-2227",
    customerName: "Auto Peças Vitória",
    customerDocument: "67.890.123/0001-65",
    sellerName: "João Pedro Alencar",
    date: "2026-07-18",
    items: [{ productName: "Tampão de borracha padrão M", quantity: 250, unitPrice: 32 }],
    freight: 75,
    discount: 20,
    deliveryAddress: "Av. Fernando Ferrari, 300 — Vitória/ES",
    paymentTerm: "30 dias",
  },
  {
    number: "PED-2225",
    customerName: "Armazém Central Alimentos",
    customerDocument: "56.789.012/0001-54",
    sellerName: "Carlos Meneses",
    date: "2026-08-10",
    items: [{ productName: "Filme PVC industrial 30cm", quantity: 100, unitPrice: 39 }],
    freight: 55,
    discount: 0,
    deliveryAddress: "Av. Sertório, 5200 — Porto Alegre/RS",
    paymentTerm: "À vista",
  },
  {
    number: "PED-2221",
    customerName: "Metalúrgica Bragança",
    customerDocument: "34.567.890/0001-32",
    sellerName: "Marcos Vinícius Prado",
    date: "2026-08-03",
    items: [{ productName: "Parafuso M8 inox sextavado", quantity: 300, unitPrice: 58 }],
    freight: 0,
    discount: 40,
    deliveryAddress: "Estr. Municipal, 500 — Bragança Paulista/SP",
    paymentTerm: "30 dias",
  },
  {
    number: "PED-2219",
    customerName: "Distribuidora Rio Sul",
    customerDocument: "23.456.789/0001-21",
    sellerName: "Renata Souza Lima",
    date: "2026-08-01",
    items: [{ productName: "Caixa de papelão reforçada M", quantity: 2000, unitPrice: 6.5 }],
    freight: 210,
    discount: 100,
    deliveryAddress: "Av. Brasil, 9800 — Rio de Janeiro/RJ",
    paymentTerm: "60 dias",
  },
];

const STATUSES: SalesOrder["status"][] = ["entregue", "entregue", "faturado", "processando", "entregue", "pendente", "processando", "faturado"];

const ORDERS: SalesOrder[] = BASE.map((o, i) => ({
  id: `ped-${o.number.split("-")[1]}`,
  ...o,
  status: STATUSES[i] ?? "pendente",
}));

export function getMockOrders(): SalesOrder[] {
  return ORDERS;
}

export function getMockOrderById(id: string): SalesOrder | undefined {
  return ORDERS.find((o) => o.id === id);
}

export function getOrderTotal(order: SalesOrder): number {
  return total(order);
}

export function getOrderSubtotal(order: SalesOrder): number {
  return order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}
