"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

const CurrencyContext = createContext<string>("PKR");

/**
 * Single source of the business currency for client components.
 * Fetched once from settings; default PKR until loaded.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("PKR");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings?.currency) setCurrency(d.settings.currency);
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  return (
    <CurrencyContext.Provider value={currency}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): string {
  return useContext(CurrencyContext);
}
