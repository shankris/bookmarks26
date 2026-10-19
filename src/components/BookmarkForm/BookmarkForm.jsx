/* src/components/BookmarkForm/BookmarkForm.jsx */

"use client";

import { useRef, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, Check, Globe } from "lucide-react";
import StarRating from "@/components/StarRating/StarRating";
import bookmarkCategories from "@/data/bookmarkCategories.json";
import styles from "./BookmarkForm.module.css";
import TagInput from "@/components/TagInput/TagInput";

/* --------------------------------------------------
URL Helpers
-------------------------------------------------- */

function normalizeUrl(value) {
  const trimmed = value.trim();

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getDomain(value) {
  return new URL(normalizeUrl(value)).hostname.toLowerCase().replace(/^www\./, "");
}

function validateUrl(value) {
  try {
    const normalized = normalizeUrl(value);
    const parsed = new URL(normalized);

    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

/* --------------------------------------------------
Visit Frequency Options
-------------------------------------------------- */

const VISIT_FREQUENCIES = [
  { label: "1 week", value: "1week" },
  { label: "2 weeks", value: "2weeks" },
  { label: "1 month", value: "1month" },
  { label: "2 months", value: "2months" },
  { label: "4 months", value: "4months" },
  { label: "6 months", value: "6months" },
  { label: "9 months", value: "9months" },
  { label: "12 months", value: "12months" },
];

/* --------------------------------------------------
Bookmark Form
-------------------------------------------------- */

export default function BookmarkForm({ onSubmit, onCancel }) {
  const [step, setStep] = useState(1);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState("0");
  const [visitFrequency, setVisitFrequency] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewStatus, setPreviewStatus] = useState("idle");
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");

  const requestId = useRef(0);
  const lastFetchedUrl = useRef("");

  const selectedCategory = bookmarkCategories.find((item) => item.id === categoryId);

  const subcategories = selectedCategory?.subcategories || [];

  const selectedSubcategory = subcategories.find((item) => item.id === subcategoryId);

  /* --------------------------------------------------
  Clear Website Data
  -------------------------------------------------- */

  function clearWebsiteData() {
    requestId.current += 1;
    lastFetchedUrl.current = "";

    setUrl("");
    setName("");
    setDescription("");
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
    setError("");
  }

  /* --------------------------------------------------
  Reset Form
  -------------------------------------------------- */

  function resetForm() {
    clearWebsiteData();

    setCategoryId("");
    setSubcategoryId("");
    setTags("");
    setRating("0");
    setVisitFrequency("");
    setStep(1);
  }

  /* --------------------------------------------------
  Fetch Website Preview
  -------------------------------------------------- */

  async function fetchPreview(value) {
    const normalized = validateUrl(value);

    if (!normalized) {
      setPreview(null);
      setPreviewStatus("idle");
      setPreviewError("");
      setError("Please enter a valid website URL.");
      lastFetchedUrl.current = "";
      return false;
    }

    if (lastFetchedUrl.current === normalized && ["success", "error"].includes(previewStatus) && preview?.url === normalized) {
      return true;
    }

    const currentRequestId = ++requestId.current;

    lastFetchedUrl.current = normalized;

    setPreview(null);
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

      if (currentRequestId !== requestId.current) {
        return false;
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to retrieve website details.");
      }

      const domain = data.domain || getDomain(normalized);

      setPreview({
        ...data,
        url: normalized,
        domain,
        title: data.title || "",
        description: data.description || "",
        imageUrl: data.imageUrl || "",
        faviconUrl: data.faviconUrl || "",
        siteName: data.siteName || data.title || domain,
      });

      setName(data.title || data.siteName || domain);
      setDescription(data.description || "");
      setPreviewStatus("success");

      return true;
    } catch (fetchError) {
      if (currentRequestId !== requestId.current) {
        return false;
      }

      const domain = getDomain(normalized);

      setPreview({
        url: normalized,
        domain,
        title: "",
        description: "",
        imageUrl: "",
        faviconUrl: "",
        siteName: domain,
      });

      setName(domain);
      setDescription("");
      setPreviewStatus("error");
      setPreviewError("We couldn't retrieve the website details. You can still continue.");

      return true;
    }
  }

  /* --------------------------------------------------
  Handle URL Changes
  -------------------------------------------------- */

  function handleUrlChange(value) {
    requestId.current += 1;
    lastFetchedUrl.current = "";

    setUrl(value);
    setName("");
    setDescription("");
    setPreview(null);
    setPreviewStatus("idle");
    setPreviewError("");
    setError("");
  }

  /* --------------------------------------------------
  Continue To Step Two
  -------------------------------------------------- */

  async function handleNext() {
    setError("");

    const normalized = validateUrl(url);

    if (!normalized) {
      setError("Please enter a valid website URL.");
      return;
    }

    if (!preview || preview.url !== normalized || !["success", "error"].includes(previewStatus)) {
      const fetched = await fetchPreview(url);

      if (!fetched) {
        return;
      }
    }

    // Do not advance if the URL changed while fetching.
    if (requestId.current !== requestId.current || validateUrl(url) !== normalized) {
      return;
    }

    setStep(2);
  }

  /* --------------------------------------------------
  Select Main Category
  -------------------------------------------------- */

  function handleCategorySelect(nextCategoryId) {
    setCategoryId(nextCategoryId);
    setSubcategoryId("");
    setError("");
  }

  /* --------------------------------------------------
  Submit Bookmark
  -------------------------------------------------- */

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalized = validateUrl(url);

    if (!normalized) {
      setError("Please enter a valid website URL.");
      setStep(1);
      return;
    }

    if (!preview || preview.url !== normalized) {
      setError("Please retrieve the website details first.");
      setStep(1);
      return;
    }

    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }

    if (!selectedSubcategory) {
      setError("Please select a subcategory.");
      return;
    }

    if (!visitFrequency) {
      setError("Please select a visit frequency.");
      return;
    }

    const domain = getDomain(normalized);

    onSubmit({
      name: name.trim() || preview.siteName || domain,
      url: normalized,
      domain,
      description: description.trim(),

      category: selectedCategory.name,
      categoryId: selectedCategory.id,

      subcategory: selectedSubcategory.name,
      subcategoryId: selectedSubcategory.id,

      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),

      rating: Number(rating),
      visitFrequency,

      faviconUrl: preview.faviconUrl || "",
      previewImageUrl: preview.imageUrl || "",
      originalFaviconUrl: preview.faviconUrl || "",
      originalImageUrl: preview.imageUrl || "",
      siteName: preview.siteName || domain,
    });

    resetForm();
  }

  /* --------------------------------------------------
  Render Form
  -------------------------------------------------- */

  return (
    <form
      className={styles.bookmarkForm}
      onSubmit={handleSubmit}
    >
      {/* Step One: URL And Preview */}

      {step === 1 && (
        <>
          <div className={styles.formField}>
            <label htmlFor='bookmark-url'>Website URL</label>

            <div className={styles.urlInputRow}>
              <div className={styles.urlInputWrapper}>
                <input
                  id='bookmark-url'
                  type='text'
                  inputMode='url'
                  className={styles.urlInput}
                  value={url}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && previewStatus !== "loading") {
                      event.preventDefault();
                      fetchPreview(url);
                    }
                  }}
                  placeholder='Paste a website URL'
                  autoComplete='url'
                  required
                />

                {url && (
                  <button
                    type='button'
                    className={styles.urlClearButton}
                    onClick={clearWebsiteData}
                    aria-label='Clear website URL'
                    title='Clear URL'
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <button
                type='button'
                className={styles.urlFetchButton}
                onClick={() => fetchPreview(url)}
                disabled={!url.trim() || previewStatus === "loading"}
                aria-label='Search website'
                title='Retrieve website details'
              >
                {previewStatus === "loading" ? <span className={styles.urlLoadingIndicator} /> : <Search size={20} />}
              </button>
            </div>
          </div>

          {previewStatus === "loading" && (
            <p
              className={styles.previewStatus}
              role='status'
            >
              Retrieving website details…
            </p>
          )}

          {preview && (
            <section
              className={styles.linkPreview}
              aria-label='Website link preview'
            >
              {preview.imageUrl && (
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
              )}

              <div className={styles.previewBody}>
                <div className={styles.previewDomain}>
                  <span>{preview.domain}</span>
                </div>

                <h3 className={styles.previewTitle}>
                  {preview.faviconUrl && (
                    <img
                      src={preview.faviconUrl}
                      alt=''
                      className={styles.previewFavicon}
                      loading='lazy'
                      referrerPolicy='no-referrer'
                    />
                  )}
                  <span>{name || preview.siteName || preview.domain}</span>
                </h3>

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

          {error && (
            <p
              className={styles.formError}
              role='alert'
            >
              {error}
            </p>
          )}

          {/* Rating */}

          <div className={styles.formField}>
            <span className={styles.ratingLabel}>Rating</span>

            <StarRating
              name='bookmark-rating'
              ratings={["Good", "Great", "Excellent", "Awesome", "Fantastic"]}
              value={Number(rating)}
              onChange={(nextRating) => setRating(String(nextRating))}
              size={32}
            />
          </div>

          {/* Visit Frequency */}

          <div className={styles.formField}>
            <span className={styles.fieldLabel}>Visit frequency *</span>

            <div className={styles.frequencyButtons}>
              {VISIT_FREQUENCIES.map((item) => {
                const selected = visitFrequency === item.value;

                return (
                  <button
                    key={item.value}
                    type='button'
                    className={`${styles.frequencyButton} ${selected ? styles.frequencyButtonActive : ""}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setVisitFrequency(item.value);
                      setError("");
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.formSubmit}
              onClick={handleNext}
              disabled={previewStatus === "loading" || !url.trim()}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}

      {/* Step Two: Website Summary And Bookmark Details */}

      {step === 2 && (
        <>
          <section
            className={styles.websiteSummary}
            aria-label='Website details'
          >
            <div className={styles.websiteSummaryHeader}>
              {preview?.faviconUrl ? (
                <img
                  src={preview.faviconUrl}
                  alt=''
                  className={styles.summaryFavicon}
                  referrerPolicy='no-referrer'
                />
              ) : (
                <span className={styles.summaryFaviconFallback}>
                  <Globe size={22} />
                </span>
              )}

              <h3 className={styles.summaryName}>{name || preview?.siteName || preview?.domain}</h3>
            </div>

            <p className={styles.summaryDescription}>{description || "No description available."}</p>

            <p className={styles.summaryUrl}>{url}</p>
          </section>

          {/* Main Categories */}

          <div className={styles.formField}>
            <span className={styles.fieldLabel}>Category *</span>

            <div className={styles.selectionButtons}>
              {bookmarkCategories
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item) => {
                  const selected = categoryId === item.id;

                  return (
                    <button
                      key={item.id}
                      type='button'
                      className={`${styles.selectionButton} ${selected ? styles.selectionButtonActive : ""}`}
                      aria-pressed={selected}
                      onClick={() => handleCategorySelect(item.id)}
                    >
                      {item.name}

                      {selected && <Check size={16} />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Subcategories */}

          {selectedCategory && (
            <div className={styles.formField}>
              <span className={styles.fieldLabel}>Subcategory *</span>

              <div className={styles.selectionButtons}>
                {subcategories
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const selected = subcategoryId === item.id;

                    return (
                      <button
                        key={item.id}
                        type='button'
                        className={`${styles.selectionButton} ${selected ? styles.selectionButtonActive : ""}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setSubcategoryId(item.id);
                          setError("");
                        }}
                      >
                        {item.name}

                        {selected && <Check size={16} />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tags */}

          <TagInput
            value={tags}
            onChange={setTags}
            sourceTitle={preview?.title || preview?.siteName || ""}
            sourceDescription={preview?.description || ""}
            maxTags={10}
          />

          {/* Rating */}

          <div className={styles.formField}>
            <span className={styles.ratingLabel}>Rating</span>

            <StarRating
              name='bookmark-rating'
              ratings={["Good", "Great", "Excellent", "Awesome", "Fantastic"]}
              value={Number(rating)}
              onChange={(nextRating) => setRating(String(nextRating))}
              size={32}
            />
          </div>

          {/* Visit Frequency */}

          <div className={styles.formField}>
            <span className={styles.fieldLabel}>Visit frequency *</span>

            <div className={styles.frequencyButtons}>
              {VISIT_FREQUENCIES.map((item) => {
                const selected = visitFrequency === item.value;

                return (
                  <button
                    key={item.value}
                    type='button'
                    className={`${styles.frequencyButton} ${selected ? styles.frequencyButtonActive : ""}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setVisitFrequency(item.value);
                      setError("");
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p
              className={styles.formError}
              role='alert'
            >
              {error}
            </p>
          )}

          {/* Step Navigation */}

          <div className={styles.formActions}>
            <button
              type='button'
              className={styles.formCancel}
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <button
              type='submit'
              className={styles.formSubmit}
            >
              Add Bookmark
            </button>
          </div>
        </>
      )}
    </form>
  );
}
