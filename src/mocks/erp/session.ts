/**
 * Dados do Topbar do ERP: notificações e seletor de empresa/filial. 100% mock
 * — o nome/logo real do tenant vem do banco (buscado em erp/layout.tsx), o
 * resto aqui é só pra a interface não parecer vazia nesta fase visual.
 */

export type Company = {
  id: string;
  name: string;
  cnpj: string;
  isMatriz: boolean;
};

export function getMockCompanies(): Company[] {
  return [
    { id: "matriz", name: "Matriz — São Paulo/SP", cnpj: "12.345.678/0001-90", isMatriz: true },
    { id: "filial-rj", name: "Filial — Rio de Janeiro/RJ", cnpj: "12.345.678/0002-71", isMatriz: false },
    { id: "filial-mg", name: "Filial — Belo Horizonte/MG", cnpj: "12.345.678/0003-52", isMatriz: false },
  ];
}

export type NotificationTone = "info" | "success" | "warning" | "danger";

export type Notification = {
  id: string;
  title: string;
  description: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
};

export function getMockNotifications(): Notification[] {
  return [
    {
      id: "n1",
      title: "Proposta aprovada",
      description: "PROP-1042 foi aprovada por Indústria Ferraz Ltda.",
      tone: "success",
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      read: false,
    },
    {
      id: "n2",
      title: "Estoque baixo",
      description: "Chapa de aço 2mm está abaixo do mínimo (8 un. restantes).",
      tone: "warning",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false,
    },
    {
      id: "n3",
      title: "Boleto vencido",
      description: "Boleto de Comércio Aliança MB venceu há 3 dias.",
      tone: "danger",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      read: true,
    },
    {
      id: "n4",
      title: "OP concluída",
      description: "OP-3391 foi finalizada com 0% de rejeição.",
      tone: "info",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      read: true,
    },
  ];
}
