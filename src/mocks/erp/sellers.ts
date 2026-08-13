export type Seller = {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
  salesTotal: number;
  status: "ativo" | "inativo";
};

const SELLERS: Seller[] = [
  { id: "vnd-01", name: "Carlos Meneses", email: "carlos.meneses@empresa.com.br", phone: "(11) 98811-2233", commissionRate: 4, salesTotal: 312500, status: "ativo" },
  { id: "vnd-02", name: "Renata Souza Lima", email: "renata.lima@empresa.com.br", phone: "(21) 97722-1144", commissionRate: 3.5, salesTotal: 268900, status: "ativo" },
  { id: "vnd-03", name: "João Pedro Alencar", email: "joaopedro.alencar@empresa.com.br", phone: "(31) 96633-5566", commissionRate: 4.5, salesTotal: 189700, status: "ativo" },
  { id: "vnd-04", name: "Fernanda Cardoso", email: "fernanda.cardoso@empresa.com.br", phone: "(41) 95544-7788", commissionRate: 4, salesTotal: 147300, status: "ativo" },
  { id: "vnd-05", name: "Marcos Vinícius Prado", email: "marcos.prado@empresa.com.br", phone: "(51) 94455-9900", commissionRate: 3, salesTotal: 88200, status: "inativo" },
  { id: "vnd-06", name: "Bianca Ferreira Reis", email: "bianca.reis@empresa.com.br", phone: "(85) 93366-1122", commissionRate: 4.5, salesTotal: 224600, status: "ativo" },
];

export function getMockSellers(): Seller[] {
  return SELLERS;
}
