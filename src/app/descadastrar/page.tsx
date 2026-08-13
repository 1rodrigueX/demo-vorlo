import { createAdminClient } from "@/lib/supabase/admin";
import { verifyEmailSignature } from "@/lib/email/platformUpdate";

/**
 * Descadastro dos e-mails de novidades. Sem sessão — quem clica veio do
 * próprio e-mail. A assinatura no link (`t`) é o que impede alguém de
 * descadastrar o endereço dos outros só trocando o parâmetro da URL.
 *
 * Só afeta comunicados de novidade. E-mail de cobrança e de conta continuam
 * indo, porque são transacionais: quem paga precisa saber que venceu.
 */
export default async function DescadastrarPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e: email, t: signature } = await searchParams;

  const valid = Boolean(email && signature && verifyEmailSignature(email, signature));

  if (valid && email) {
    const admin = createAdminClient();
    await admin
      .from("platform_email_optouts")
      .upsert({ email: email.toLowerCase(), reason: "Link no e-mail" }, { onConflict: "email" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-xl font-bold tracking-tight text-gray-900">
          Vorlo<span className="text-[#ff5722]">.</span>
        </div>

        {valid ? (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Pronto, você saiu da lista</h1>
            <p className="mt-2 text-sm text-gray-600">
              Não vamos mais te mandar novidades da plataforma. Avisos sobre sua conta e cobrança continuam
              chegando — esses a gente precisa enviar.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Mudou de ideia? É só falar com a gente que te colocamos de volta.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900">Link inválido</h1>
            <p className="mt-2 text-sm text-gray-600">
              Esse link de descadastro não confere. Abra o link direto do e-mail que você recebeu, ou responda
              a mensagem pedindo pra sair da lista.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
