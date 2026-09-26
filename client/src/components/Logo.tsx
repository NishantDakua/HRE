import { Link } from 'react-router-dom';

interface LogoProps {
  inverted?: boolean;
}

export default function Logo({ inverted = false }: LogoProps) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <path d="M20 2 36 11v18L20 38 4 29V11z" fill="#1d4ed8" />
        <path d="M20 2 36 11 20 20 4 11z" fill="#60a5fa" />
        <path d="M20 20v18L4 29V11z" fill="#2563eb" />
        <path d="M20 13.5 26 17v6.5L20 27l-6-3.5V17z" fill="#fff" opacity="0.9" />
      </svg>
      <span className="leading-none">
        <span className={`block text-xl font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>
          HRE
        </span>
        <span className={`block text-[10px] font-medium ${inverted ? 'text-slate-300' : 'text-slate-500'}`}>
          Hospitality Resource Exchange
        </span>
      </span>
    </Link>
  );
}
