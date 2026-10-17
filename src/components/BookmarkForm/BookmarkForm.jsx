/* src/components/BookmarkForm/BookmarkForm.jsx */

"use client";

import { useRef, useState } from "react";
import styles from "./BookmarkForm.module.css";

function normalizeUrl(value) {
  const trimmed = value.trim();

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getDomain(value) {
  const url = new URL(normalizeUrl(value));

  return url.hostname.toLowerCase().replace(/^www\./, "");
}

export default function BookmarkForm({ categories = [], onSubmit, onCancel }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("5");

  const [preview, setPreview] = useState(null);
  const [previewStatus, setPreviewStatus] = useState("idle");
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");

  const requestId = useRef(0);
  const lastFetchedUrl = useRef("");

  async function fetchPreview(value) {
    const trimmed = value.trim();

    if (!trimmed) return;

    let normalized;

    try {
      normalized = normalizeUrl(trimmed);
      const parsed = new URL(normalized);

      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || !parsed.hostname.includes(".")) {
        throw new Error("Invalid URL");
      }
    } catch {
      setPreviewStatus("error");
      setPreviewError("Please enter a valid website URL.");
      return;
    }

    if (lastFetchedUrl.current === normalized) return;

    const currentRequestId = ++requestId.current;

    lastFetchedUrl.current = normalized;
    setPreviewStatus("loading");
    setPreviewError("");
    setError("");

    try {
      const response = await fetch("/api/bookmark-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalized }),
      });

      const data = await response.json();

      if (currentRequestId !== requestId.current) return;

      if (!response.ok) {
        throw new Error(data.error || "Unable to retrieve website details.");
      }

      setPreview(data);
      setPreviewStatus("success");

      // Populate fields only when empty, so edits are not overwritten.
      setName((current) => (current.trim() ? current : data.title || ""));
      setDescription((current) => (current.trim() ? current : data.description || ""));
    } catch (fetchError) {
      if (currentRequestId !== requestId.current) return;

      lastFetchedUrl.current = "";
      setPreviewStatus("error");
      setPreviewError(fetchError.message || "We couldn't retrieve the website details. You can enter them manually.");

      try {
        setPreview({
          url: normalized,
          domain: getDomain(normalized),
          title: "",
          description: "",
          imageUrl: "",
          faviconUrl: "",
          siteName: getDomain(normalized),
        });
      } catch {
        setPreview(null);
      }
    }
  }

  function handleUrlChange(value) {
    setUrl(value);
    setError("");

    // Ignore an older response if the user starts entering a different URL.
    requestId.current += 1;
    lastFetchedUrl.current = "";
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!url.trim() || !name.trim() || !category.trim()) {
      setError("Please enter a website URL, name, and category.");
      return;
    }

    let normalizedUrl;
    let domain;

    try {
      normalizedUrl = normalizeUrl(url);
      const parsed = new URL(normalizedUrl);

      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || !parsed.hostname.includes(".")) {
        throw new Error("Invalid URL");
      }

      domain = getDomain(normalizedUrl);
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    onSubmit({
      name: name.trim(),
      url: preview?.url || normalizedUrl,
      domain,
      description: description.trim(),
      category: category.trim(),
      rating: Number(rating),
      faviconUrl: preview?.faviconUrl || "",
      previewImageUrl: preview?.imageUrl || "",
      originalFaviconUrl: preview?.faviconUrl || "",
      originalImageUrl: preview?.imageUrl || "",
      siteName: preview?.siteName || domain,
    });

    setUrl("");
    setName("");
    setDescription("");
    setCategory("");
    setRating("5");
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
    lastFetchedUrl.current = "";
  }

  return (
    <form
      className={styles.bookmarkForm}
      onSubmit={handleSubmit}
    >
      {/* Website URL */}
      <div className={styles.formField}>
        <label htmlFor='bookmark-url'>Website URL *</label>

        <input
          id='bookmark-url'
          type='url'
          value={url}
          onChange={(event) => handleUrlChange(event.target.value)}
          onBlur={() => fetchPreview(url)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              fetchPreview(url);
            }
          }}
          placeholder='https://ui.shadcn.com/'
          autoComplete='url'
          required
        />

        <p className={styles.formHint}>Enter a URL to retrieve the website title, description, favicon, and preview image.</p>
      </div>

      {/* Preview loading */}
      {previewStatus === "loading" && (
        <p
          className={styles.previewStatus}
          role='status'
        >
          Retrieving website details…
        </p>
      )}

      {/* Social-style preview */}
      {preview && (
        <section
          className={styles.linkPreview}
          aria-label='Website link preview'
        >
          {preview.imageUrl ? (
            <div className={styles.previewImageFrame}>
              <img
                src={preview.imageUrl}
                alt=''
                className={styles.previewImage}
                loading='lazy'
                referrerPolicy='no-referrer'
                onError={(event) => {
                  event.currentTarget.closest(`.${styles.previewImageFrame}`)?.classList.add(styles.previewImageFailed);
                }}
              />
            </div>
          ) : null}

          <div className={styles.previewBody}>
            <div className={styles.previewDomain}>
              {preview.faviconUrl && (
                <img
                  src={preview.faviconUrl}
                  alt=''
                  className={styles.previewFavicon}
                  loading='lazy'
                  referrerPolicy='no-referrer'
                />
              )}

              <span>{preview.domain}</span>
            </div>

            <h3 className={styles.previewTitle}>{name || preview.title || preview.siteName || preview.domain}</h3>

            {(description || preview.description) && <p className={styles.previewDescription}>{description || preview.description}</p>}

            <p className={styles.previewUrl}>{preview.url}</p>
          </div>
        </section>
      )}

      {previewError && (
        <p
          className={styles.formHint}
          role='status'
        >
          {previewError}
        </p>
      )}

      {/* Editable website name */}
      <div className={styles.formField}>
        <label htmlFor='bookmark-name'>Name *</label>
        <input
          id='bookmark-name'
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder='Website name'
          required
        />
      </div>

      {/* Editable description */}
      <div className={styles.formField}>
        <label htmlFor='bookmark-description'>Description</label>
        <textarea
          id='bookmark-description'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder='What makes this resource useful?'
          rows={4}
        />
      </div>

      {/* Category */}
      <div className={styles.formField}>
        <label htmlFor='bookmark-category'>Category *</label>
        <input
          id='bookmark-category'
          list='bookmark-categories'
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder='UI Libraries'
          required
        />

        <datalist id='bookmark-categories'>
          {categories.map((item) => (
            <option
              key={item}
              value={item}
            />
          ))}
        </datalist>
      </div>

      {/* Rating */}
      <div className={styles.formField}>
        <span className={styles.ratingLabel}>Rating</span>

        <div
          className={styles.rating}
          role='radiogroup'
          aria-label='Bookmark rating'
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const labels = ["Good", "Great", "Excellent", "Awesome", "Fantastic"];
            const selected = Number(rating) === value;

            return (
              <label
                key={value}
                className={styles.ratingOption}
                title={`${value} ${value === 1 ? "star" : "stars"} — ${labels[value - 1]}`}
              >
                <input
                  className={styles.ratingInput}
                  type='radio'
                  name='bookmark-rating'
                  value={value}
                  checked={selected}
                  onChange={() => setRating(String(value))}
                  aria-label={`${value} ${value === 1 ? "star" : "stars"} — ${labels[value - 1]}`}
                />

                <svg
                  className={`${styles.ratingStar} ${selected || Number(rating) >= value ? styles.ratingStarSelected : ""}`}
                  viewBox='0 0 32 32'
                  aria-hidden='true'
                >
                  <polygon points='16,2 20.3,11 30,12.4 23,19.2 24.7,29 16,24.4 7.3,29 9,19.2 2,12.4 11.7,11' />
                </svg>
              </label>
            );
          })}
        </div>

        <span
          className={styles.ratingDescription}
          aria-live='polite'
        >
          {["Good", "Great", "Excellent", "Awesome", "Fantastic"][Number(rating) - 1]}
        </span>
      </div>

      <p className={styles.formHint}>Bookmark IDs, category IDs, dates, and visit counts are generated automatically.</p>

      {error && (
        <p
          className={styles.formError}
          role='alert'
        >
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button
          type='submit'
          className={styles.formSubmit}
        >
          Add Bookmark
        </button>

        <button
          type='button'
          className={styles.formCancel}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
