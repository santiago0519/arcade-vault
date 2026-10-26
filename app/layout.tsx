import type { Metadata } from "next";
import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const courier = Courier_Prime({
  variable: "--font-courier",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Juega a clásicos arcade en línea y compite por el puntaje más alto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetbrains.variable} ${courier.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div className="av-root">{children}</div>
      </body>
    </html>
  );
}
