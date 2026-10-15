/* src/components/Header/Header.jsx */

"use client";

import { Menu, Sun, Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "./Header.module.css";

/* --------------------------------------------------
   Header Component
-------------------------------------------------- */

export default function Header({ onMenuClick }) {
  const [theme, setTheme] = useState("light");
  const themeButtonRef = useRef(null);

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
     Apply Theme
  -------------------------------------------------- */

  function applyTheme(nextTheme) {
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("stash-theme", nextTheme);
    setTheme(nextTheme);
  }

  /* --------------------------------------------------
     Toggle Theme
  -------------------------------------------------- */

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    const root = document.documentElement;

    // Fall back to a normal theme change if unsupported.
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyTheme(nextTheme);
      return;
    }

    // Use the theme button as the circular reveal origin.
    const button = themeButtonRef.current;
    const rect = button?.getBoundingClientRect();

    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);

    const transition = document.startViewTransition(() => {
      applyTheme(nextTheme);
    });

    // Clean up after both transition animations have completed.
    transition.finished
      .catch(() => {
        // The theme has already been applied; ignore animation errors.
      })
      .finally(() => {
        root.style.removeProperty("--theme-x");
        root.style.removeProperty("--theme-y");
      });
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandGroup}>
          <button
            type='button'
            className={styles.menuButton}
            aria-label='Open navigation'
            onClick={onMenuClick}
          >
            <Menu
              size={22}
              strokeWidth={1.8}
            />
          </button>

          <a
            className={styles.brand}
            href='/'
            aria-label='Stash home'
          >
            Stash<span className={styles.brandDot}>.</span>
          </a>
        </div>

        <div className={styles.actions}>
          <button
            ref={themeButtonRef}
            type='button'
            className={styles.themeButton}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon
                size={19}
                strokeWidth={1.8}
              />
            ) : (
              <Sun
                size={19}
                strokeWidth={1.8}
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
