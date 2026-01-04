const STORAGE_KEY = "hp_lang";

/**
 * Minimal i18n helper for this app.
 * - 3 languages: English, Español, Português
 * - Persists selection in localStorage
 * - Applies translations via data attributes in the DOM
 */
const DICTS = {
    en: {
        "app.title": "Harry Potter Dialogues",

        "track.subtitles": "Subtitles",

        "search.placeholder": "Search an English word or phrase — Harry Potter 1",
        "search.button": "Search",
        "lang.label": "Language",

        "clipEnded.title": "Clip ended",
        "clipEnded.text": "Search another word or phrase.",
        "clipEnded.button": "Search",

        "status.searching": "Searching…",
        "status.notFound": "Not found",
        "status.tapToPlay": "Tap to enable playback",

        "legal.open": "Educational disclaimer",
        "legal.title": "Educational Disclaimer",
        "legal.p1": "This project is an independent, non-commercial educational experiment.",
        "legal.p2": "I do not own the rights to <em>Harry Potter</em>, its movies, characters, or related intellectual property. All rights belong to <strong>Warner Bros. Entertainment</strong> and <strong>J.K. Rowling</strong>.",
        "legal.p3": "This website is intended solely to demonstrate a technical concept: real-time subtitle indexing and video seeking.",
        "legal.p4": "No movie files are distributed with this project. The public repository does <strong>not</strong> include any copyrighted video or subtitle files. Any media used must be provided by the user from a legally obtained source.",
        "legal.p5": "If this project causes any concern, I sincerely apologize and will address it immediately."
    },

    es: {
        "app.title": "Diálogos de Harry Potter",

        "track.subtitles": "Subtítulos",

        "search.placeholder": "Buscar palabra o frase (diálogos en inglés) — Harry Potter 1",
        "search.button": "Buscar",
        "lang.label": "Idioma",

        "clipEnded.title": "Clip terminado",
        "clipEnded.text": "Buscá otra palabra o frase.",
        "clipEnded.button": "Buscar",

        "status.searching": "Buscando…",
        "status.notFound": "No encontrado",
        "status.tapToPlay": "Tocá para habilitar la reproducción",

        "legal.open": "Aviso educativo",
        "legal.title": "Aviso Educativo",
        "legal.p1": "Este proyecto es un experimento educativo independiente y sin fines comerciales.",
        "legal.p2": "No poseo los derechos de <em>Harry Potter</em>, sus películas, personajes ni la propiedad intelectual relacionada. Todos los derechos pertenecen a <strong>Warner Bros. Entertainment</strong> y <strong>J.K. Rowling</strong>.",
        "legal.p3": "Este sitio web tiene como único objetivo demostrar un concepto técnico: indexado de subtítulos en tiempo real y búsqueda por timestamp en video.",
        "legal.p4": "Este proyecto no distribuye archivos de la película. El repositorio público <strong>no</strong> incluye archivos de video ni subtítulos con copyright. Cualquier medio utilizado debe ser provisto por el usuario a partir de una fuente obtenida legalmente.",
        "legal.p5": "Si este proyecto causa alguna preocupación, lo lamento sinceramente y lo abordaré de inmediato."
    },

    pt: {
        "app.title": "Diálogos de Harry Potter",

        "track.subtitles": "Legendas",

        "search.placeholder": "Buscar palavra ou frase (diálogos em inglês) — Harry Potter 1",
        "search.button": "Buscar",
        "lang.label": "Idioma",

        "clipEnded.title": "Clipe finalizado",
        "clipEnded.text": "Pesquise outra palavra ou frase.",
        "clipEnded.button": "Buscar",

        "status.searching": "Pesquisando…",
        "status.notFound": "Não encontrado",
        "status.tapToPlay": "Toque para habilitar a reprodução",

        "legal.open": "Aviso educacional",
        "legal.title": "Aviso Educacional",
        "legal.p1": "Este projeto é um experimento educacional independente e sem fins comerciais.",
        "legal.p2": "Eu não possuo os direitos de <em>Harry Potter</em>, seus filmes, personagens ou propriedade intelectual relacionada. Todos os direitos pertencem à <strong>Warner Bros. Entertainment</strong> e <strong>J.K. Rowling</strong>.",
        "legal.p3": "Este site tem como único objetivo demonstrar um conceito técnico: indexação de legendas em tempo real e busca/seek no vídeo.",
        "legal.p4": "Nenhum arquivo do filme é distribuído com este projeto. O repositório público <strong>não</strong> inclui arquivos de vídeo ou legendas protegidos por direitos autorais. Qualquer mídia usada deve ser fornecida pelo usuário a partir de uma fonte obtida legalmente.",
        "legal.p5": "Se este projeto causar qualquer preocupação, peço desculpas sinceramente e vou resolver isso imediatamente."
    }
};

export function getLanguage() {
    const saved = (localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (saved && DICTS[saved]) return saved;

    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("pt")) return "pt";
    return "en";
}

export function setLanguage(lang) {
    const normalized = String(lang || "").toLowerCase();
    const next = DICTS[normalized] ? normalized : "en";
    localStorage.setItem(STORAGE_KEY, next);
    applyI18n(document, next);
    return next;
}

export function t(key, lang) {
    const l = lang || getLanguage();
    return (
        (DICTS[l] && DICTS[l][key]) ||
        (DICTS.en && DICTS.en[key]) ||
        key
    );
}

export function applyI18n(root = document, lang = getLanguage()) {
    // Update <html lang>
    const html = document.documentElement;
    if (html) html.lang = lang;

    // Title
    document.title = t("app.title", lang);

    // data-i18n: textContent
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key, lang);
    });

    // data-i18n-placeholder: placeholder attribute
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.setAttribute("placeholder", t(key, lang));
    });

    // data-i18n-html: innerHTML (trusted static strings from DICTS)
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        if (!key) return;
        el.innerHTML = t(key, lang);
    });

    // data-i18n-attr: translate attributes.
    // Format: "attrName:key;attr2:key2" (e.g. "aria-label:lang.label")
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        const spec = el.getAttribute("data-i18n-attr") || "";
        spec
            .split(";")
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((pair) => {
                const idx = pair.indexOf(":");
                if (idx === -1) return;
                const attr = pair.slice(0, idx).trim();
                const key = pair.slice(idx + 1).trim();
                if (!attr || !key) return;
                el.setAttribute(attr, t(key, lang));
            });
    });
}
