import type { Metadata } from "next";
import "./globals.css";
import Providers from './providers';

export const metadata: Metadata = {
  title: "GitHub Copilot User Level Metrics Viewer",
  description: "Made with ❤️ and GitHub Copilot",
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📊</text></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The focus-visible polyfill used by Primer adds attributes to <html> on the client.
    <html lang="en" data-color-mode="light" data-light-theme="light" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
