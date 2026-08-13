export type QuoteStatus =
  | "rascunho"
  | "enviada"
  | "visualizada"
  | "negociacao"
  | "aprovada"
  | "recusada"
  | "expirada"
  | "cancelada";

export type QuoteItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
};

export type Quote = {
  id: string;
  number: string;
  date: string;
  validUntil: string;
  customerName: string;
  sellerName: string;
  items: QuoteItem[];
  paymentTerm: string;
  freightType: string;
  carrier: string;
  freight: number;
  discount: number;
  notes: string;
  status: QuoteStatus;
};

function itemSubtotal(item: QuoteItem): number {
  return item.quantity * item.unitPrice * (1 - item.discountPct / 100);
}

export function getQuoteSubtotal(quote: Pick<Quote, "items">): number {
  return quote.items.reduce((s, i) => s + itemSubtotal(i), 0);
}

export function getQuoteTotal(quote: Pick<Quote, "items" | "freight" | "discount">): number {
  return getQuoteSubtotal(quote) + quote.freight - quote.discount;
}

const QUOTES: Quote[] = [
  {
    id: "prop-1042",
    number: "PROP-1042",
    date: "2026-08-01",
    validUntil: "2026-08-20",
    customerName: "Indústria Ferraz Ltda",
    sellerName: "Carlos Meneses",
    items: [
      { productName: "Chapa de aço 2mm 1000x2000mm", quantity: 30, unitPrice: 289, discountPct: 5 },
      { productName: "Parafuso M8 inox sextavado", quantity: 50, unitPrice: 58, discountPct: 0 },
    ],
    paymentTerm: "30/60/90 dias",
    freightType: "CIF",
    carrier: "Transportadora Veloz Cargo",
    freight: 480,
    discount: 200,
    notes: "Cliente pediu prioridade na entrega — combinar data com o comercial.",
    status: "aprovada",
  },
  {
    id: "prop-1041",
    number: "PROP-1041",
    date: "2026-08-04",
    validUntil: "2026-08-18",
    customerName: "Comércio Aliança MB",
    sellerName: "Renata Souza Lima",
    items: [{ productName: "Caixa de papelão reforçada M", quantity: 3000, unitPrice: 6.5, discountPct: 8 }],
    paymentTerm: "À vista",
    freightType: "FOB",
    carrier: "—",
    freight: 0,
    discount: 0,
    notes: "",
    status: "negociacao",
  },
  {
    id: "prop-1040",
    number: "PROP-1040",
    date: "2026-08-06",
    validUntil: "2026-08-13",
    customerName: "Distribuidora Rio Sul",
    sellerName: "João Pedro Alencar",
    items: [{ productName: "Filme PVC industrial 30cm", quantity: 200, unitPrice: 39, discountPct: 0 }],
    paymentTerm: "45 dias",
    freightType: "CIF",
    carrier: "Transportadora Veloz Cargo",
    freight: 110,
    discount: 0,
    notes: "",
    status: "visualizada",
  },
  {
    id: "prop-1039",
    number: "PROP-1039",
    date: "2026-08-07",
    validUntil: "2026-08-14",
    customerName: "Metalúrgica Bragança",
    sellerName: "Fernanda Cardoso",
    items: [{ productName: "Engate rápido M10 zincado", quantity: 500, unitPrice: 8.9, discountPct: 3 }],
    paymentTerm: "30 dias",
    freightType: "FOB",
    carrier: "—",
    freight: 0,
    discount: 0,
    notes: "",
    status: "enviada",
  },
  {
    id: "prop-1038",
    number: "PROP-1038",
    date: "2026-07-28",
    validUntil: "2026-08-05",
    customerName: "Construtora Horizonte",
    sellerName: "Bianca Ferreira Reis",
    items: [{ productName: "Tinta epóxi azul RAL 5010", quantity: 25, unitPrice: 149, discountPct: 0 }],
    paymentTerm: "À vista",
    freightType: "CIF",
    carrier: "Transportadora Veloz Cargo",
    freight: 60,
    discount: 0,
    notes: "Cliente não respondeu — proposta vencida.",
    status: "expirada",
  },
  {
    id: "prop-1037",
    number: "PROP-1037",
    date: "2026-07-25",
    validUntil: "2026-08-01",
    customerName: "Farmacêutica Nova Vida",
    sellerName: "Marcos Vinícius Prado",
    items: [{ productName: "Resina de poliuretano 500ml", quantity: 15, unitPrice: 72, discountPct: 0 }],
    paymentTerm: "30 dias",
    freightType: "FOB",
    carrier: "—",
    freight: 0,
    discount: 0,
    notes: "Cliente optou por outro fornecedor.",
    status: "recusada",
  },
  {
    id: "prop-1036",
    number: "PROP-1036",
    date: "2026-08-09",
    validUntil: "2026-08-25",
    customerName: "Auto Peças Vitória",
    sellerName: "Carlos Meneses",
    items: [{ productName: "Cabo elétrico flexível 2,5mm 2m", quantity: 400, unitPrice: 11.2, discountPct: 0 }],
    paymentTerm: "30 dias",
    freightType: "CIF",
    carrier: "Transportadora Veloz Cargo",
    freight: 95,
    discount: 0,
    notes: "",
    status: "rascunho",
  },
  {
    id: "prop-1035",
    number: "PROP-1035",
    date: "2026-07-20",
    validUntil: "2026-07-30",
    customerName: "Têxtil Nordeste S.A.",
    sellerName: "Renata Souza Lima",
    items: [{ productName: "Etiqueta térmica 100x50mm", quantity: 1000, unitPrice: 18, discountPct: 10 }],
    paymentTerm: "45 dias",
    freightType: "CIF",
    carrier: "Transportadora Veloz Cargo",
    freight: 180,
    discount: 0,
    notes: "Pedido cancelado a pedido do cliente.",
    status: "cancelada",
  },
];

export function getMockQuotes(): Quote[] {
  return QUOTES;
}

export function getMockQuoteById(id: string): Quote | undefined {
  return QUOTES.find((q) => q.id === id);
}
