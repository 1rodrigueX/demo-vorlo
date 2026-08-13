export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  admissionDate: string;
  status: "ativo" | "inativo";
};

const EMPLOYEES: Employee[] = [
  { id: "fun-01", name: "Antônio Ribeiro Neto", role: "Operador de máquina", department: "Produção", admissionDate: "2021-03-15", status: "ativo" },
  { id: "fun-02", name: "Sueli Aparecida Gomes", role: "Supervisora de produção", department: "Produção", admissionDate: "2019-07-01", status: "ativo" },
  { id: "fun-03", name: "Rafael Torres Lima", role: "Analista financeiro", department: "Financeiro", admissionDate: "2022-11-08", status: "ativo" },
  { id: "fun-04", name: "Camila Duarte Alves", role: "Assistente de estoque", department: "Estoque", admissionDate: "2023-02-20", status: "ativo" },
  { id: "fun-05", name: "Eduardo Machado", role: "Comprador", department: "Compras", admissionDate: "2020-09-14", status: "ativo" },
  { id: "fun-06", name: "Patrícia Nogueira", role: "Analista fiscal", department: "Fiscal", admissionDate: "2018-05-30", status: "ativo" },
  { id: "fun-07", name: "Wesley dos Santos", role: "Operador de máquina", department: "Produção", admissionDate: "2024-01-10", status: "ativo" },
  { id: "fun-08", name: "Ivone Cristina Barbosa", role: "Recepcionista", department: "Administrativo", admissionDate: "2017-04-03", status: "inativo" },
];

export function getMockEmployees(): Employee[] {
  return EMPLOYEES;
}
