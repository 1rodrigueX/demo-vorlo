"use client";

import { useEffect, useState } from "react";
import { Star, GitFork, ArrowUpRight } from "lucide-react";
import { MagicCard } from "@/components/site/MagicCard";
import { GITHUB_USER, GITHUB_DESTAQUES } from "@/lib/site/content";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  updated_at: string;
}

/** Lista ao vivo os repositórios públicos do GitHub. Vazio/erro = não renderiza. */
export function GithubRepos() {
  const [repos, setRepos] = useState<Repo[] | null>(null);

  useEffect(() => {
    if (!GITHUB_USER) return;
    let cancelled = false;
    fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Repo[]) => {
        if (cancelled || !Array.isArray(data)) return;
        let list = data.filter((r) => !r.fork);
        if (GITHUB_DESTAQUES.length) {
          list = GITHUB_DESTAQUES.map((n) => list.find((r) => r.name === n)).filter(Boolean) as Repo[];
        } else {
          list = list.slice(0, 6);
        }
        setRepos(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!repos || repos.length === 0) return null;

  return (
    <div className="mt-24 sm:mt-32">
      <p className="type-eyebrow mb-4">Código aberto</p>
      <h2 className="type-display mb-10 text-[clamp(1.8rem,4.5vw,2.8rem)] text-white-soft">
        Direto do <span className="text-ignite">GitHub</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block h-full">
            <MagicCard className="h-full rounded-xl border border-carbon-700 bg-carbon-800">
              <div className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="type-display text-[1.1rem] text-white-soft">{repo.name}</h3>
                  <ArrowUpRight size={16} className="shrink-0 text-grey transition-colors group-hover:text-ignite" />
                </div>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-grey">
                  {repo.description ?? "Sem descrição."}
                </p>
                <div className="mt-5 flex items-center gap-4 font-mono text-[0.7rem] text-grey">
                  {repo.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="block h-2 w-2 rounded-full bg-ignite" />
                      {repo.language}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} /> {repo.stargazers_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork size={12} /> {repo.forks_count}
                  </span>
                </div>
              </div>
            </MagicCard>
          </a>
        ))}
      </div>
    </div>
  );
}
