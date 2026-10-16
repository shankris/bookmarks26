/* src/components/Sidebar/Sidebar.jsx */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, Clock3, History, LayoutGrid, ChevronDown, ChevronRight, Compass, Plus, RotateCcw } from "lucide-react";

import sidebarData from "./sidebar.json";
import styles from "./Sidebar.module.css";

/* --------------------------------------------------
   Icon Mapping
-------------------------------------------------- */

// JSON stores icon names as strings.
// Map those names to the corresponding Lucide components.

const iconMap = {
  Bookmark,
  Clock3,
  History,
  LayoutGrid,
  RotateCcw,
};

/* --------------------------------------------------
   Sidebar Component
-------------------------------------------------- */

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();

  const [expandedCategories, setExpandedCategories] = useState(["development"]);

  const { smartViews, categories, contribution } = sidebarData;

  /* --------------------------------------------------
     Category Accordion
  -------------------------------------------------- */

  function toggleCategory(categoryId) {
    setExpandedCategories((current) => (current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]));
  }

  /* --------------------------------------------------
     Navigation Item
  -------------------------------------------------- */

  function renderNavLink({ label, href, icon }) {
    const Icon = iconMap[icon];
    const isActive = pathname === href;

    return (
      <Link
        key={href}
        href={href}
        className={`${styles.navLink} ${isActive ? styles.active : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
      >
        {Icon && (
          <Icon
            size={18}
            strokeWidth={1.8}
          />
        )}

        <span>{label}</span>
      </Link>
    );
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <nav
      className={styles.sidebar}
      aria-label='Main navigation'
    >
      {/* Main Navigation */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>LIBRARY</p>

        <div className={styles.navList}>{smartViews.map((item) => renderNavLink(item))}</div>
      </section>
      {/* Categories */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>CATEGORIES</p>

        <div className={styles.categoryList}>
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <div
                key={category.id}
                className={styles.categoryGroup}
              >
                <button
                  type='button'
                  className={styles.categoryButton}
                  aria-expanded={isExpanded}
                  onClick={() => toggleCategory(category.id)}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}

                  <span className={styles.categoryName}>{category.label}</span>

                  <span className={styles.count}>{category.count}</span>
                </button>

                {isExpanded && (
                  <div className={styles.subcategoryList}>
                    {category.subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        href={`/category/${category.id}/${subcategory.id}`}
                        className={styles.subcategoryLink}
                        onClick={onNavigate}
                      >
                        <span>{subcategory.label}</span>
                        <span className={styles.count}>{subcategory.count}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {/* Contribution
      <section className={styles.contributeSection}>
        <div className={styles.contributeIcon}>
          <Compass
            size={20}
            strokeWidth={1.8}
          />
        </div>

        <div className={styles.contributeText}>
          <p className={styles.contributeTitle}>{contribution.title}</p>

          <p className={styles.contributeDescription}>{contribution.description}</p>
        </div>

        <Link
          href={contribution.href}
          className={styles.addLink}
          onClick={onNavigate}
        >
          <Plus size={16} />
          {contribution.buttonLabel}
        </Link>
      </section> */}
    </nav>
  );
}
