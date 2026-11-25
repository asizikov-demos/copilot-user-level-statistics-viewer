import type { Metadata } from "next";
import "./globals.css";
import Providers from './providers';

const siteUrl = 'https://asizikov-demos.github.io/copilot-user-level-statistics-viewer/';
const socialTitle = 'Copilot Metrics Viewer';
const socialDescription = 'Explore GitHub Copilot adoption, activity, and insights. Open source; your data stays in the browser.';
const socialImage = {
  url: `${siteUrl}social-preview.png`,
  width: 1200,
  height: 630,
  alt: 'Copilot Metrics Viewer dashboard with an activity calendar and team usage charts',
};

export const metadata: Metadata = {
  title: "GitHub Copilot User Level Metrics Viewer",
  description: "Made with ❤️ and GitHub Copilot",
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: socialTitle,
    title: socialTitle,
    description: socialDescription,
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description: socialDescription,
    images: [socialImage],
  },
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
    <html lang="en" data-color-mode="light" data-light-theme="light" data-dark-theme="dark_dimmed" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
