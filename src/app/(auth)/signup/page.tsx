import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Cadastro por convite</h1>
        <p className="mb-6 text-sm text-gray-500">
          Não existe cadastro público. Peça ao dono ou gestor do seu CRM pra criar seu acesso.
        </p>
        <Link href="/login" className="text-sm font-medium text-indigo-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
