export type SystemUser = {
  id: string;
  name: string;
  email: string;
  profile: string;
  lastAccess: string;
  status: "ativo" | "inativo";
};

const USERS: SystemUser[] = [
  { id: "usr-01", name: "Danillo Rodrigues", email: "danillo@empresa.com.br", profile: "Administrador", lastAccess: new Date(Date.now() - 1000 * 60 * 20).toISOString(), status: "ativo" },
  { id: "usr-02", name: "Carlos Meneses", email: "carlos.meneses@empresa.com.br", profile: "Vendedor", lastAccess: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), status: "ativo" },
  { id: "usr-03", name: "Sueli Aparecida Gomes", email: "sueli.gomes@empresa.com.br", profile: "Produção", lastAccess: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), status: "ativo" },
  { id: "usr-04", name: "Rafael Torres Lima", email: "rafael.lima@empresa.com.br", profile: "Financeiro", lastAccess: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), status: "ativo" },
  { id: "usr-05", name: "Eduardo Machado", email: "eduardo.machado@empresa.com.br", profile: "Compras", lastAccess: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), status: "inativo" },
];

export function getMockUsers(): SystemUser[] {
  return USERS;
}
