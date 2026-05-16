import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "sonner";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Wanderbite — Khám phá ẩm thực thông minh",
  description: "Tìm kiếm món ăn và nhà hàng phù hợp với khẩu vị của bạn bằng AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={beVietnamPro.variable}>
      <body
        suppressHydrationWarning
        className={`${beVietnamPro.className} antialiased text-slate-800 dark:text-[#E6DFD5] bg-slate-50 dark:bg-[#2A2420]`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
