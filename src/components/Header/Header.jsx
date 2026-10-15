/* src/components/Header/Header.jsx */

"use client";

import { Menu, Sun, Moon, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useSearch } from "@/context/SearchContext";

import styles from "./Header.module.css";

/* --------------------------------------------------
   Header
-------------------------------------------------- */

export default function Header({ onMenuClick }) {
  const [theme, setTheme] = useState("light");
  const themeButtonRef = useRef(null);

  const { searchTerm, setSearchTerm } = useSearch();

  /* --------------------------------------------------
     Initialize Theme
  -------------------------------------------------- */

  useEffect(() => {
    const savedTheme = localStorage.getItem("stash-theme");

    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    const initialTheme = savedTheme || preferredTheme;

    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  /* --------------------------------------------------
     Theme Controls
  -------------------------------------------------- */

  function applyTheme(nextTheme) {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("stash-theme", nextTheme);
    setTheme(nextTheme);
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    const button = themeButtonRef.current;

    if (!button || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme(nextTheme);
      return;
    }

    const rect = button.getBoundingClientRect();

    document.documentElement.style.setProperty("--theme-x", `${rect.left + rect.width / 2}px`);

    document.documentElement.style.setProperty("--theme-y", `${rect.top + rect.height / 2}px`);

    document.startViewTransition(() => {
      applyTheme(nextTheme);
    });
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Brand and Navigation */}
        <div className={styles.brandGroup}>
          <button
            type='button'
            className={styles.menuButton}
            onClick={onMenuClick}
            aria-label='Open navigation'
          >
            <Menu size={21} />
          </button>

          <a
            className={styles.brand}
            href='/'
          >
            Stash<span>.</span>
          </a>
        </div>

        {/* Bookmark Search */}
        <label className={styles.searchBox}>
          <Search
            size={18}
            aria-hidden='true'
          />

          <input
            type='search'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search bookmarks...'
            aria-label='Search bookmarks'
          />

          {searchTerm && (
            <button
              type='button'
              className={styles.clearSearch}
              onClick={() => setSearchTerm("")}
              aria-label='Clear search'
            >
              <X size={16} />
            </button>
          )}
        </label>

        {/* Header Actions */}
        <div className={styles.actions}>
          <button
            ref={themeButtonRef}
            type='button'
            className={styles.themeButton}
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}
