const icons = {
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
};

const items: [keyof typeof icons, string][] = [
  ["shield", "Nessun obbligo di acquisto"],
  ["mail", "La stima nella tua email"],
  ["user", "Il preventivo con il referente"],
];

export const TrustStrip = () => (
  <div className="border-y border-[#f0dccb] bg-background1 px-[5%] py-5 dark:border-white/10">
    <div className="flex flex-wrap items-center justify-center gap-4 md:justify-between md:gap-6">
      <span className="hidden text-[11px] opacity-70 lg:inline">
        UN’INDICAZIONE PER ORIENTARTI
      </span>
      {items.map(([icon, text], i) => (
        <div
          key={icon}
          className={`items-center gap-3 text-[11px] md:text-xs ${i === 2 ? "hidden sm:flex" : "flex"}`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 fill-none stroke-orange stroke-[1.5]"
          >
            {icons[icon]}
          </svg>
          {text}
        </div>
      ))}
    </div>
  </div>
);
