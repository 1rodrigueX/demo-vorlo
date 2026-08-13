export type BankAccount = {
  id: string;
  bank: string;
  agency: string;
  account: string;
  type: "Conta corrente" | "Conta poupança";
  balance: number;
};

const BANK_ACCOUNTS: BankAccount[] = [
  { id: "bnk-01", bank: "Banco do Brasil", agency: "3421-5", account: "18.902-3", type: "Conta corrente", balance: 142380.5 },
  { id: "bnk-02", bank: "Itaú Unibanco", agency: "0891", account: "56102-9", type: "Conta corrente", balance: 87650.2 },
  { id: "bnk-03", bank: "Bradesco", agency: "1122-0", account: "0034521-8", type: "Conta poupança", balance: 31200 },
];

export function getMockBankAccounts(): BankAccount[] {
  return BANK_ACCOUNTS;
}

export function getMockTotalBalance(): number {
  return BANK_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);
}
