/* src/context/SearchContext.jsx */

"use client";

import { createContext, useContext, useState } from "react";

/* --------------------------------------------------
   Search Context
-------------------------------------------------- */

const SearchContext = createContext(null);

/* --------------------------------------------------
   Search Provider
-------------------------------------------------- */

export function SearchProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState("");

  return <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>{children}</SearchContext.Provider>;
}

/* --------------------------------------------------
   Search Hook
-------------------------------------------------- */

export function useSearch() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }

  return context;
}
