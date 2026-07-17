"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageSquareHeart } from "lucide-react";
import { submitPlatformFeedback, type ActionState } from "@/lib/actions/platform-feedback";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export function FeedbackTab({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(submitPlatformFeedback, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <MessageSquareHeart size={22} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Tem alguma dúvida ou sugestão?</h2>
      <p className="mt-2 text-sm text-gray-500">
        Manda pra gente antes mesmo de assinar — vamos responder direto no e-mail <strong>{email}</strong>.
      </p>

      <form ref={formRef} action={formAction} className="mt-6 space-y-3 text-left">
        <Textarea
          name="message"
          rows={4}
          required
          placeholder="Conte sua dúvida, ideia ou o que gostaria de ver no CRM..."
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-600">{state.message}</p>}
        <Button type="submit" className="w-full" isLoading={isPending}>
          Enviar mensagem
        </Button>
      </form>
    </div>
  );
}
