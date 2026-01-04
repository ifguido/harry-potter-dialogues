/**
 * Calls the backend search endpoint and returns the next matching span.
 * Expected JSON response: { start_ms, end_ms }
 */
export async function searchNext(apiBase, term, afterMs, offsetMs) {
    const url =
        `${apiBase}?q=${encodeURIComponent(term)}` +
        `&after_ms=${Number(afterMs)}` +
        `&offset_ms=${Number(offsetMs)}`;

    const r = await fetch(url);
    if (!r.ok) throw new Error("not found");

    return r.json();
}
