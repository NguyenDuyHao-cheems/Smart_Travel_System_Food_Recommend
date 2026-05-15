"use client";

import React, { useState } from "react";
import { Roboto } from "next/font/google";
import { Sidebar } from "./Sidebar";
import { Header } from "./ui/Header";

// [FIX-CONFLICT]: Import và sử dụng font Roboto để đồng bộ với trang Khám phá, sửa lỗi lệch font
const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700", "900"],
});

export function PageLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
        <Header showBack={true} />
        <main className="flex-1 px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
