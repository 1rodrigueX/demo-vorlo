import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Pagamento confirmado!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Seu CRM está sendo preparado. Em poucos minutos você vai receber um e-mail com seu acesso e um link pra
          criar sua senha.
        </p>
        <p className="mt-1 text-xs text-gray-400">Não esqueça de checar a caixa de spam.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
