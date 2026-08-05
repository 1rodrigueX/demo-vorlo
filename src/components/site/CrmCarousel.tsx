"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

/* Telas do CRM renderizadas em CSS (frames limpos, sem dado real de cliente). */

function PipelineScreen() {
  return (
    <div className="pf-crm">
      <div className="pf-crm__rail">
        <i className="on" />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="pf-crm__main">
        <div className="pf-crm__top">
          <span className="pf-crm__title">Pipeline</span>
          <span className="pf-crm__avatar" />
        </div>
        <div className="pf-crm__board">
          <div className="pf-crm__col">
            <div className="pf-crm__colhead">
              <b style={{ background: "#7a6f66" }} />
              Novo
            </div>
            <div className="pf-crm__card">
              <div className="pf-crm__line" style={{ width: "82%" }} />
              <span className="pf-crm__val">R$ 3,4k</span>
            </div>
            <div className="pf-crm__card">
              <div className="pf-crm__line" style={{ width: "66%" }} />
              <span className="pf-crm__val">R$ 1,2k</span>
            </div>
          </div>
          <div className="pf-crm__col">
            <div className="pf-crm__colhead">
              <b style={{ background: "var(--color-ignite)" }} />
              Qualif.
            </div>
            <div className="pf-crm__card">
              <div className="pf-crm__line" style={{ width: "74%" }} />
              <span className="pf-crm__val">R$ 8,9k</span>
            </div>
            <div className="pf-crm__card">
              <div className="pf-crm__line" style={{ width: "58%" }} />
              <span className="pf-crm__val">R$ 5,0k</span>
            </div>
          </div>
          <div className="pf-crm__col">
            <div className="pf-crm__colhead">
              <b style={{ background: "#46d17f" }} />
              Ganho
            </div>
            <div className="pf-crm__card">
              <div className="pf-crm__line" style={{ width: "78%" }} />
              <span className="pf-crm__val">R$ 12k</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className="pf-crm">
      <div className="pf-crm__rail">
        <i />
        <i className="on" />
        <i />
        <i />
        <i />
      </div>
      <div className="pf-crm__main">
        <div className="pf-crm__top">
          <span className="pf-crm__title">Visão geral</span>
          <span className="pf-crm__avatar" />
        </div>
        <div className="pf-dash__kpis">
          <div className="pf-kpi">
            <span className="pf-kpi__label">Contatos</span>
            <span className="pf-kpi__num">316</span>
          </div>
          <div className="pf-kpi">
            <span className="pf-kpi__label">Pipeline</span>
            <span className="pf-kpi__num hot">R$ 48k</span>
          </div>
          <div className="pf-kpi">
            <span className="pf-kpi__label">Conversão</span>
            <span className="pf-kpi__num">27%</span>
          </div>
        </div>
        <div className="pf-dash__chart">
          <span className="pf-dash__cap">Receita ganha por mês</span>
          <div className="pf-dash__bars">
            <span style={{ height: "38%" }} />
            <span style={{ height: "55%" }} />
            <span style={{ height: "47%" }} />
            <span style={{ height: "70%" }} />
            <span style={{ height: "60%" }} />
            <span style={{ height: "86%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadsScreen() {
  return (
    <div className="pf-crm">
      <div className="pf-crm__rail">
        <i />
        <i />
        <i className="on" />
        <i />
        <i />
      </div>
      <div className="pf-leads__list">
        <div className="pf-leads__row on">
          <span className="pf-leads__ava" />
          <div className="pf-leads__rmeta">
            <i />
            <i className="sm" />
          </div>
        </div>
        <div className="pf-leads__row">
          <span className="pf-leads__ava" />
          <div className="pf-leads__rmeta">
            <i />
            <i className="sm" />
          </div>
        </div>
        <div className="pf-leads__row">
          <span className="pf-leads__ava" />
          <div className="pf-leads__rmeta">
            <i />
            <i className="sm" />
          </div>
        </div>
        <div className="pf-leads__row">
          <span className="pf-leads__ava" />
          <div className="pf-leads__rmeta">
            <i />
            <i className="sm" />
          </div>
        </div>
      </div>
      <div className="pf-leads__thread">
        <div className="pf-bubble in">Oi! Vi o site de vocês 👀</div>
        <div className="pf-bubble out">Olá! Quer um orçamento?</div>
        <div className="pf-bubble in">Quero sim, pra uma loja</div>
        <div className="pf-bubble out">Perfeito, já te passo 😊</div>
        <div className="pf-leads__input" />
      </div>
    </div>
  );
}

function FlowScreen() {
  return (
    <div className="pf-crm">
      <div className="pf-crm__rail">
        <i />
        <i />
        <i />
        <i className="on" />
        <i />
      </div>
      <div className="pf-crm__main">
        <div className="pf-crm__top">
          <span className="pf-crm__title">Trajetória · SDR</span>
          <span className="pf-crm__avatar" />
        </div>
        <div className="pf-flow__row">
          <div className="pf-node">
            <b style={{ background: "#46d17f" }} />
            Gatilho
          </div>
          <span className="pf-flow__link" />
          <div className="pf-node accent">
            <b style={{ background: "var(--color-ignite)" }} />
            IA · SDR
          </div>
          <span className="pf-flow__link" />
          <div className="pf-node">
            <b style={{ background: "#25d366" }} />
            WhatsApp
          </div>
          <span className="pf-flow__link" />
          <div className="pf-node">
            <b style={{ background: "#7a6f66" }} />
            Tag
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { url: "app.synexa.cloud/pipeline", el: <PipelineScreen /> },
  { url: "app.synexa.cloud/dashboard", el: <DashboardScreen /> },
  { url: "app.synexa.cloud/leads", el: <LeadsScreen /> },
  { url: "app.synexa.cloud/trajetorias", el: <FlowScreen /> },
];

/** Carrossel de telas do CRM dentro de um mockup de navegador (auto-avança,
 * pausa no hover, com setas e indicadores). */
export function CrmCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const count = SLIDES.length;
  const go = (i: number) => setIndex((i + count) % count);

  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => setIndex((p) => (p + 1) % count), 4200);
    return () => clearInterval(t);
  }, [reduce, paused, count]);

  return (
    <div>
      <div className="pf-browser" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="pf-browser__bar">
          <div className="pf-browser__dots">
            <i />
            <i />
            <i />
          </div>
          <div className="pf-browser__url">{SLIDES[index].url}</div>
        </div>
        <div className="pf-browser__body">
          <div className="pf-carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {SLIDES.map((s, i) => (
              <div className="pf-carousel__slide" key={i} aria-hidden={i !== index}>
                {s.el}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="pf-carousel__arrow pf-carousel__arrow--prev"
            onClick={() => go(index - 1)}
            aria-label="Tela anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="pf-carousel__arrow pf-carousel__arrow--next"
            onClick={() => go(index + 1)}
            aria-label="Próxima tela"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="pf-carousel__dots">
        {SLIDES.map((_, i) => (
          <button
            type="button"
            key={i}
            className={cn("pf-carousel__dot", i === index && "is-active")}
            onClick={() => setIndex(i)}
            aria-label={`Ir para tela ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
