import { Card, CardContent } from './ui/card.jsx';

export default function AuthShell({ quote, description, children }) {
  return (
    <section className="flex justify-center py-10">
      <div className="grid w-full max-w-[780px] grid-cols-1 overflow-hidden rounded-xl border shadow-lg md:grid-cols-[1fr_1.1fr]">
        <aside
          className="relative flex flex-col justify-end gap-2.5 bg-center p-7 text-white"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(160deg, rgba(31,58,99,0.9), rgba(20,39,63,0.95)), url('/crescent.jpg')",
            backgroundSize: '16px 16px, cover, cover',
          }}
        >
          <span className="font-display text-4xl leading-none font-extrabold text-brand-accent">&ldquo;</span>
          <h2 className="text-[1.35rem] font-bold text-white">{quote}</h2>
          <p className="text-sm leading-relaxed text-white/80">{description}</p>
        </aside>

        <Card className="justify-center rounded-none border-none py-8 shadow-none">
          <CardContent className="px-8">{children}</CardContent>
        </Card>
      </div>
    </section>
  );
}
