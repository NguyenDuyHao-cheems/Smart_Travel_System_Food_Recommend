import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Travel System",
  description: "Food Recommendation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
