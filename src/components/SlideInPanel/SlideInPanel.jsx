/* src/components/SlideInPanel/SlideInPanel.jsx */

"use client";

import { useEffect, useRef } from "react";
import styles from "./SlideInPanel.module.css";

export default function SlideInPanel({ isOpen, onClose, title, closeLabel, children }) {
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`${styles.cdPanel} ${styles.cdPanelFromRight} ${isOpen ? styles.cdPanelIsVisible : ""}`}
      aria-hidden={!isOpen}
    >
      <div
        ref={panelRef}
        className={styles.cdPanelInner}
      >
        <header className={styles.cdPanelHeader}>
          <h1>{title}</h1>

          <button
            type='button'
            className={styles.cdPanelClose}
            onClick={onClose}
            aria-label={closeLabel}
            disabled={!isOpen}
          >
            {closeLabel}
          </button>
        </header>

        <div className={styles.cdPanelContainer}>
          <div className={styles.cdPanelContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}
