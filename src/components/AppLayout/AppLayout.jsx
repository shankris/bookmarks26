/* src/components/AppLayout/AppLayout.jsx */

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import Header from "@/components/Header/Header";
import Sidebar from "@/components/Sidebar/Sidebar";

import styles from "./AppLayout.module.css";

/* --------------------------------------------------
   App Layout
-------------------------------------------------- */

export default function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* --------------------------------------------------
     Sidebar Controls
  -------------------------------------------------- */

  function openSidebar() {
    setIsSidebarOpen(true);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className={styles.app}>
      <Header onMenuClick={openSidebar} />

      <div className={styles.layout}>
        {/* Desktop Sidebar */}
        <aside className={styles.desktopSidebar}>
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.button
              type='button'
              className={styles.backdrop}
              aria-label='Close navigation'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeSidebar}
            />

            <motion.aside
              className={styles.mobileSidebar}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "tween",
                duration: 0.25,
                ease: "easeInOut",
              }}
            >
              <Sidebar onNavigate={closeSidebar} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
