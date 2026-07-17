"use client";

import { useState } from "react";
import { Info, PlayCircle, HelpCircle, MessageSquareHeart, CreditCard } from "lucide-react";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils/cn";
import { ChoosePlanForm } from "@/components/billing/ChoosePlanForm";
import { AboutTab } from "./AboutTab";
import { TutorialsTab } from "./TutorialsTab";
import { FaqTab } from "./FaqTab";
import { FeedbackTab } from "./FeedbackTab";
import type { BillingPlan, PlatformTutorialVideo } from "@/types/domain";

const TABS = [
  { id: "sobre", label: "Sobre", icon: Info },
  { id: "tutoriais", label: "Tutoriais", icon: PlayCircle },
  { id: "duvidas", label: "Dúvidas frequentes", icon: HelpCircle },
  { id: "feedback", label: "Feedback", icon: MessageSquareHeart },
  { id: "planos", label: "Planos", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function OnboardingTabs({
  plans,
  videos,
  preselectedPlanId,
  ownerName,
  email,
}: {
  plans: BillingPlan[];
  videos: PlatformTutorialVideo[];
  preselectedPlanId?: string;
  ownerName: string | null;
  email: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("sobre");

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">FALA AI CRM</span>
          <UserMenu name={ownerName || email || "Usuário"} email={email} />
        </header>

        <div className="mb-2 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {ownerName ? `Bem-vindo(a), ${ownerName.split(" ")[0]}!` : "Bem-vindo(a)!"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dá uma olhada em como o FALA AI CRM funciona antes de escolher o plano — sem pressa.
          </p>
        </div>

        <nav className="mt-6 flex flex-wrap justify-center gap-1 border-b border-gray-200">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-900",
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="py-8">
          {activeTab === "sobre" && <AboutTab />}
          {activeTab === "tutoriais" && <TutorialsTab videos={videos} />}
          {activeTab === "duvidas" && <FaqTab />}
          {activeTab === "feedback" && <FeedbackTab email={email} />}
          {activeTab === "planos" && (
            <ChoosePlanForm plans={plans} preselectedPlanId={preselectedPlanId} ownerName={ownerName} />
          )}
        </div>
      </div>
    </div>
  );
}
