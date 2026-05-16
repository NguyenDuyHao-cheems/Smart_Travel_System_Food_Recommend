"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "./AppShell";

/** Shared layout wrapper for secondary pages (favorites, history, collections, etc.)
 *  Uses the new AppShell with hamburger drawer.
 */
export function PageLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {title && (
          <h1 className="text-2xl md:text-3xl font-black text-[#3D312A] dark:text-[#E6DFD5] mb-6 tracking-tight uppercase">
            {title}
          </h1>
        )}
        {children}
      </div>
    </AppShell>
  );
}
