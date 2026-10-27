import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Família desenhada para máxima legibilidade (Braille Institute): uma escolha coerente com uma universidade pública
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  adjustFontFallback: false, // O Next não tem métricas de fallback para esta família
});

// Só para os dígitos do código de verificação
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ScientificHub UEMG",
  description: "Plataforma acadêmica da UEMG para publicar trabalhos, encontrar orientadores e descobrir pesquisas afins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${atkinson.variable} ${atkinsonMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
