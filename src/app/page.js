/* src/app/page.js */

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowUpRight, ArrowDownUp, Eye, Search, Sparkles, Star, CirclePlus, Info, Calendar, Plus } from "lucide-react";

import SlideInPanel from "@/components/SlideInPanel/SlideInPanel";
import BookmarkForm from "@/components/BookmarkForm/BookmarkForm";

import styles from "./page.module.css";
import bookmarks from "@/data/bookmarks.json";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Never visited";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Never visited";

  const elapsedMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsedMs / (1000 * 60));
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;

  return `${Math.floor(days / 365)}y ago`;
}

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* --------------------------------------------------
   Home Page
-------------------------------------------------- */

export default function HomePage() {
  const [sortBy, setSortBy] = useState("name");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [bookmarkItems, setBookmarkItems] = useState(bookmarks);

  const sortRef = useRef(null);

  const categories = [...new Set(bookmarkItems.map((bookmark) => bookmark.category))].filter(Boolean);

  function handleAddBookmark(formData) {
    const baseId = createSlug(formData.domain) || "bookmark";
    let id = baseId;
    let suffix = 2;

    // Ensure the bookmark ID is unique.
    while (bookmarkItems.some((bookmark) => bookmark.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const newBookmark = {
      id,
      name: formData.name,
      url: formData.url,
      domain: formData.domain,
      description: formData.description,
      category: formData.category,
      categoryId: createSlug(formData.category),
      rating: formData.rating,
      visits: 0,
      addedAt: new Date().toISOString().slice(0, 10),
      lastVisitedAt: null,
    };

    setBookmarkItems((current) => [...current, newBookmark]);
    setIsPanelOpen(false);
  }

  const panelData = {
    title: "Add Bookmark",
    subtitle: "Save a new resource",
    content: "Add your bookmark details here.",
    closeLabel: "Close panel",
  };

  useEffect(() => {
    function handlePointerDown(event) {
      if (!sortRef.current?.contains(event.target)) {
        setIsSortOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const sortedBookmarks = useMemo(() => {
    return [...bookmarkItems].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);

        case "rating":
          return b.rating - a.rating;

        case "mostVisited":
          return (b.visits ?? 0) - (a.visits ?? 0);

        case "recentlyVisited": {
          const aTime = a.lastVisitedAt ? new Date(a.lastVisitedAt).getTime() : 0;

          const bTime = b.lastVisitedAt ? new Date(b.lastVisitedAt).getTime() : 0;

          return bTime - aTime;
        }

        case "recent":
        default:
          return b.addedAt.localeCompare(a.addedAt);
      }
    });
  }, [bookmarkItems, sortBy]);

  return (
    <main className={styles.page}>
      {/* Page Heading */}
      <section className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <div className={styles.eyebrow}>
            <Sparkles
              size={14}
              aria-hidden='true'
            />
            YOUR PERSONAL LIBRARY
          </div>

          <h1>
            Lets get Hyper <span>linked</span>
          </h1>
          <div className={styles.subhead}>A curated space for WebDev resources worth coming back to.</div>
        </div>

        <div
          className={styles.sortMenu}
          ref={sortRef}
        >
          <button
            type='button'
            className={styles.sortButton}
            onClick={() => setIsPanelOpen(true)}
            aria-label='Add bookmark'
            title='Add bookmark'
          >
            <CirclePlus
              size={18}
              aria-hidden='true'
            />
          </button>

          <button
            type='button'
            className={styles.sortButton}
            onClick={() => setIsSortOpen((open) => !open)}
            aria-label='Sort bookmarks'
            aria-haspopup='menu'
            aria-expanded={isSortOpen}
            title='Sort bookmarks'
          >
            <ArrowDownUp
              size={18}
              aria-hidden='true'
            />
          </button>

          {isSortOpen && (
            <div
              className={styles.sortFlyout}
              role='menu'
              aria-label='Sort by'
            >
              <span className={styles.sortFlyoutHeading}>Sort by</span>

              {[
                { value: "recent", label: "Recently added" },
                { value: "name", label: "Name" },
                { value: "rating", label: "Top rated" },
                { value: "mostVisited", label: "Most visited" },
                { value: "recentlyVisited", label: "Recently visited" },
              ].map((option) => (
                <button
                  key={option.value}
                  type='button'
                  role='menuitemradio'
                  aria-checked={sortBy === option.value}
                  className={`${styles.sortOption} ${sortBy === option.value ? styles.sortOptionActive : ""}`}
                  onClick={() => {
                    setSortBy(option.value);
                    setIsSortOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <span
                      className={styles.sortCheck}
                      aria-hidden='true'
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <h2 className={styles.pageGreet}>
        Welcome back <span>Shankar</span>
      </h2>

      {/* Bookmark Results */}
      <section className={styles.bookmarkSection}>
        <div className={styles.bookmarkGrid}>
          {sortedBookmarks.map((bookmark) => (
            <article
              key={bookmark.id}
              className={styles.bookmarkCard}
            >
              <div className={styles.cardTop}>
                <div className={styles.siteIdentity}>
                  <div className={styles.faviconFrame}>
                    <img
                      src={getFaviconUrl(bookmark.domain)}
                      alt=''
                      width='32'
                      height='32'
                      loading='lazy'
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  </div>

                  <div className={styles.siteDetails}>
                    <span className={styles.siteDomain}>{bookmark.domain}</span>

                    <span className={styles.categoryTag}>{bookmark.category}</span>
                  </div>
                </div>

                <a
                  href={bookmark.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.openLink}
                  aria-label={`Open ${bookmark.name} in a new tab`}
                  title='Open website'
                >
                  <ArrowUpRight size={18} />
                </a>
              </div>

              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>
                  <a
                    href={bookmark.url}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {bookmark.name}
                  </a>
                  <Info
                    size={18}
                    className={styles.titleIcon}
                  />
                </h3>

                <p>{bookmark.description}</p>
              </div>

              {/* <div className={styles.lastVisit}>
                <span>Last visit</span>
                <span className={styles.lastVisitValue}>{formatRelativeTime(bookmark.lastVisitedAt)}</span>
              </div> */}

              <div className={styles.cardFooter}>
                <div
                  className={styles.rating}
                  aria-label={`${bookmark.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={14}
                      fill={index < bookmark.rating ? "currentColor" : "none"}
                      aria-hidden='true'
                    />
                  ))}
                </div>

                <div className={styles.visits}>
                  <Eye
                    size={14}
                    aria-hidden='true'
                  />
                  <span>{bookmark.visits ?? 0}</span>
                </div>

                <span className={styles.addedDate}>
                  {/* Added {formatDate(bookmark.addedAt)} */}
                  <Calendar
                    size={14}
                    aria-hidden='true'
                  />{" "}
                  {formatRelativeTime(bookmark.lastVisitedAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Collection Summary */}
      <footer className={styles.collectionSummary}>
        <span>
          {bookmarkItems.length} {bookmarkItems.length === 1 ? "resource" : "resources"} in your collection
        </span>
      </footer>

      <SlideInPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title='Add Bookmark'
        closeLabel='Close panel'
      >
        <BookmarkForm
          categories={categories}
          onSubmit={handleAddBookmark}
          onCancel={() => setIsPanelOpen(false)}
        />
      </SlideInPanel>
    </main>
  );
}
