export function Placeholder({ title }: { title: string }) {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-bold text-white-soft">{title}</h1>
        <p className="mt-2 text-sm text-grey">
          Esta tela é portada na <span className="text-ignite">Fase 2</span>. A casca do app já está pronta — a
          navegação e os dados ao vivo funcionam.
        </p>
      </div>
    </div>
  );
}
