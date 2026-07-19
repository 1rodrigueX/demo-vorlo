"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getPasswordStrength, type PasswordStrength } from "@/lib/utils/passwordStrength";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  /** Mostra a barrinha de força (fraca/média/forte) abaixo do campo — só faz sentido em telas de criar/trocar senha, não em login. */
  showStrength?: boolean;
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; bars: number; color: string }> = {
  fraca: { label: "Senha fraca", bars: 1, color: "bg-red-500" },
  media: { label: "Senha média", bars: 2, color: "bg-amber-500" },
  forte: { label: "Senha forte", bars: 3, color: "bg-emerald-500" },
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showStrength, onChange, defaultValue, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState(typeof defaultValue === "string" ? defaultValue : "");
    const strength = showStrength ? getPasswordStrength(value) : null;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            defaultValue={defaultValue}
            onChange={(e) => {
              if (showStrength) setValue(e.target.value);
              onChange?.(e);
            }}
            className={cn(
              "w-full rounded-md border bg-panel px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500",
              error ? "border-red-400" : "border-gray-300",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {strength && (
          <div className="mt-1.5">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= STRENGTH_CONFIG[strength].bars ? STRENGTH_CONFIG[strength].color : "bg-gray-200",
                  )}
                />
              ))}
            </div>
            <p
              className={cn(
                "mt-1 text-xs",
                strength === "fraca" && "text-red-600",
                strength === "media" && "text-amber-600",
                strength === "forte" && "text-emerald-600",
              )}
            >
              {STRENGTH_CONFIG[strength].label}
            </p>
          </div>
        )}

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
