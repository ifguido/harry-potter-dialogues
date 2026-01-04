export async function searchNext(apiBase, term, afterMs, offsetMs) {
    const url =
        `${apiBase}?q=${encodeURIComponent(term)}` +
        `&after_ms=${Number(afterMs)}` +
        `&offset_ms=${Number(offsetMs)}`;

    const r = await fetch(url);
    if (!r.ok) throw new Error("not found");
    return r.json();
}
