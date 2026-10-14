import { Eyebrow } from "./Surface";

type Props = {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
};

export const PageTitle = ({ eyebrow, title, description, children }: Props) => (
  <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
    <div>
      <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {description && <p className="mt-2.5 break-words opacity-80">{description}</p>}
    </div>
    {children}
  </div>
);
