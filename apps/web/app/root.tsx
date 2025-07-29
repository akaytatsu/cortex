import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";

import "./tailwind.css";
import "@xterm/xterm/css/xterm.css";
import "./styles/virtual-keyboard.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  // PWA Manifest
  { rel: "manifest", href: "/manifest.json" },
  // PWA Icons - Temporariamente comentadas até ícones serem criados
  // { rel: "icon", href: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
  // { rel: "icon", href: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
  // { rel: "apple-touch-icon", href: "/icons/icon-192x192.png" },
  // PWA Meta tags
  // { rel: "mask-icon", href: "/icons/icon-192x192.png", color: "#000000" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Cortex IDE" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cortex IDE" />
        <meta name="description" content="A self-hostable, intelligent IDE with integrated terminal and AI copilot" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#000000" />
        
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
