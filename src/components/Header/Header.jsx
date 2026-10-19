/* src/components/Header/Header.jsx */

"use client";

import { Menu, Sun, Moon, Search, X, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useSearch } from "@/context/SearchContext";

import styles from "./Header.module.css";

/* --------------------------------------------------
   Header
-------------------------------------------------- */

export default function Header({ onMenuClick }) {
  const [theme, setTheme] = useState("light");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const themeButtonRef = useRef(null);
  const profileRef = useRef(null);

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
     Observe Firebase Authentication
  -------------------------------------------------- */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        setProfileOpen(false);
      },
      (error) => {
        console.error("Authentication state error:", error);
        setAuthError("Unable to check your sign-in status.");
        setAuthLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /* --------------------------------------------------
     Close Profile Dropdown on Outside Click or Escape
  -------------------------------------------------- */

  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  /* --------------------------------------------------
     Google Sign-In
  -------------------------------------------------- */

  async function handleSignIn() {
    setAuthError("");
    setAuthBusy(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed:", error);

      if (error.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in was cancelled.");
      } else if (error.code === "auth/popup-blocked") {
        setAuthError("Your browser blocked the sign-in popup.");
      } else if (error.code === "auth/unauthorized-domain") {
        setAuthError("This domain is not authorized in Firebase.");
      } else {
        setAuthError("Google sign-in failed. Please try again.");
      }
    } finally {
      setAuthBusy(false);
    }
  }

  /* --------------------------------------------------
     Sign Out
  -------------------------------------------------- */

  async function handleSignOut() {
    setAuthError("");
    setAuthBusy(true);

    try {
      await signOut(auth);
      setProfileOpen(false);
    } catch (error) {
      console.error("Sign-out failed:", error);
      setAuthError("Unable to sign out. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

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
            Hyper<span>.</span>
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

          {!authLoading &&
            (user ? (
              <div
                className={styles.profileWrapper}
                ref={profileRef}
              >
                <button
                  type='button'
                  className={styles.profileButton}
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-haspopup='true'
                  aria-label='Open account menu'
                >
                  {user.photoURL ? (
                    <img
                      className={styles.profileAvatar}
                      src={user.photoURL}
                      alt=''
                      referrerPolicy='no-referrer'
                    />
                  ) : (
                    <span className={styles.profileAvatarFallback}>{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</span>
                  )}

                  <span className={styles.profileDetails}>
                    <span className={styles.profileName}>{user.displayName || "Google user"}</span>

                    <span className={styles.profileEmail}>{user.email}</span>
                  </span>

                  <ChevronDown
                    className={`${styles.profileChevron} ${profileOpen ? styles.profileChevronOpen : ""}`}
                    size={16}
                  />
                </button>

                {profileOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.dropdownIdentity}>
                      {user.photoURL ? (
                        <img
                          className={styles.dropdownAvatar}
                          src={user.photoURL}
                          alt=''
                          referrerPolicy='no-referrer'
                        />
                      ) : (
                        <span className={styles.dropdownAvatarFallback}>{(user.displayName || user.email || "U").charAt(0).toUpperCase()}</span>
                      )}

                      <div className={styles.dropdownUserDetails}>
                        <span className={styles.dropdownName}>{user.displayName || "Google user"}</span>
                        <span className={styles.dropdownEmail}>{user.email}</span>
                      </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    <button
                      type='button'
                      className={styles.dropdownSignOut}
                      onClick={handleSignOut}
                      disabled={authBusy}
                    >
                      <LogOut size={17} />
                      <span>{authBusy ? "Signing out..." : "Sign out"}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type='button'
                className={styles.authButton}
                onClick={handleSignIn}
                disabled={authBusy}
                aria-label='Login with Google'
              >
                <LogIn size={17} />
                <span>{authBusy ? "Logging in..." : "Login"}</span>
              </button>
            ))}
        </div>
      </div>

      {authError && (
        <p
          className={styles.authError}
          role='alert'
        >
          {authError}
        </p>
      )}
    </header>
  );
}
