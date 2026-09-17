// api.js - Wrapper Hacker News API

const API_BASE = 'https://hacker-news.firebaseio.com/v0';

/**
 * Converte un timestamp UNIX (in secondi) in una stringa leggibile localizzata.
 *
 * @param {number} timestampSeconds - Timestamp in secondi
 * @returns {string} - Data/ora localizzata (es. "12/05/2026 14:00:00") o "N/D" se non valido
 */
function formatUnixDate(timestampSeconds) {
  if (!Number.isFinite(timestampSeconds)) {
    return 'N/D';
  }

  return new Date(timestampSeconds * 1000).toLocaleString('it-IT');
}

/**
 * Mappa la struttura raw dell'API Hacker News in un oggetto coerente per l'app.
 *
 * @param {object} item - Oggetto ricevuto dall'API
 * @returns {object|null} - Oggetto normalizzato o `null` se l'item è falsy
 */
function mapItem(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    type: item.type || 'unknown',
    by: item.by || 'anon',
    title: item.title || '',
    text: item.text || '',
    url: item.url || '',
    score: Number(item.score) || 0,
    descendants: Number(item.descendants) || 0,
    kids: Array.isArray(item.kids) ? item.kids : [],
    parent: item.parent || null,
    time: Number(item.time) || 0,
    timeLabel: formatUnixDate(Number(item.time) || 0),
  };
}

/**
 * Effettua una chiamata `fetch` e ritorna il body JSON; lancia in caso di errore HTTP.
 *
 * @param {string} url - URL da richiamare
 * @param {string} errorPrefix - Prefisso messaggio di errore in caso di fallimento
 * @returns {Promise<any>} - JSON parsato dalla risposta
 */
async function requestJson(url, errorPrefix) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${errorPrefix} (errore ${response.status})`);
  }

  return response.json();
}

/**
 * Recupera gli ID delle top stories da Hacker News.
 *
 * @returns {Promise<Array<number>>} - Promise che risolve con un array di ID (vuoto se non ottenuti)
 */
export async function getTopStoryIds() {
  // TODO 1: Aggiungere la fetch per recuperare gli ID delle top stories
  // L'endpoint da utilizzare è `/topstories.json` usando ovviamente la costante `API_BASE` come base URL.
  // Una volta recuperati i dati (si può usare la funzione `requestJson`), verificare che
  // esistano, altrimenti restituire un array vuoto. Se esistono, restituire l'array di ID così com'è.
  try {
    const urlStories = `${API_BASE}/topstories.json`;
    const risposta = await fetch(urlStories);
    const dati = await risposta.json();
    if (!risposta.ok) {
      throw Error(
        `Errore recupero top stories (errore ${risposta.status}: ${risposta.statusText})`
      );
    }
    return dati && Array.isArray(dati) ? dati : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Recupera un item da Hacker News per ID e lo mappa nella forma utilizzata dall'app.
 *
 * @param {number|string} id - ID dell'item
 * @returns {Promise<object>} - Promise che risolve con l'item mappato
 * @throws {Error} - Se l'ID non è valido o la richiesta fallisce
 */
export async function getItemById(id) {
  const itemId = Number(id);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw new Error('ID item non valido');
  }

  const url = `${API_BASE}/item/${itemId}.json`;
  const data = await requestJson(url, 'Errore recupero item');

  return mapItem(data);
}

/**
 * Recupera più item dato un array di ID (usa `getItemById` in parallelo).
 *
 * @param {Array<number|string>} ids - Array di ID da recuperare
 * @returns {Promise<Array<object>>} - Promise che risolve con array di item validi
 */
export async function getItemsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(ids.map((id) => getItemById(id)));

  return settled
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value);
}

/**
 * Recupera i dettagli delle top stories, con batching per evitare troppe richieste contemporanee.
 *
 * @param {object} options - Opzioni di chiamata
 * @param {number} [options.total=40] - Numero massimo di story da recuperare
 * @param {number} [options.batchSize=20] - Dimensione del batch per richieste parallele
 * @returns {Promise<Array<object>>} - Promise che risolve con array di story mappate
 */
export async function getTopStoriesDetailed({ total = 40, batchSize = 20 }) {
  const ids = await getTopStoryIds();
  const selected = ids.slice(0, total);
  const result = [];

  for (let index = 0; index < selected.length; index += batchSize) {
    const batchIds = selected.slice(index, index + batchSize);
    const batchItems = await getItemsByIds(batchIds);

    batchItems
      .filter((item) => item?.type === 'story')
      .forEach((item) => {
        result.push(item);
      });
  }

  return result;
}

/**
 * Recupera i dati di un utente Hacker News.
 *
 * @param {string} userId - Username dell'utente
 * @returns {Promise<object>} - Promise che risolve con i dati utente (id, karma, about, created, submitted)
 * @throws {Error} - Se l'username non è valido o l'utente non esiste
 */
export async function getUserById(userId) {
  const id = String(userId || 'andreww591').trim();

  if (!id) {
    throw new Error('Username non valido');
  }

  const url = `${API_BASE}/user/${encodeURIComponent(id)}.json`;
  const data = await requestJson(url, 'Errore recupero utente');

  if (!data) {
    throw new Error('Utente non trovato');
  }

  return {
    id: data.id,
    karma: Number(data.karma) || 0,
    about: data.about || '',
    created: Number(data.created) || 0,
    createdLabel: formatUnixDate(Number(data.created) || 0),
    submitted: Array.isArray(data.submitted) ? data.submitted : [],
  };
}

/**
 * Recupera i dettagli degli item inviati da un utente (limitabile).
 *
 * @param {string} userId - Username dell'utente
 * @param {number} [limit=20] - Numero massimo di item da recuperare
 * @returns {Promise<{user: object, items: Array<object>}>} - Promise che risolve con l'oggetto `{ user, items }`
 */
export async function getUserSubmittedItems(userId, limit = 20) {
  const user = await getUserById();
  const ids = user.submitted.slice(0, limit);
  const items = [];

  for (const id of ids) {
    try {
      const item = await getItemById(id);

      if (item) {
        items.push(item);
      }
    } catch (_error) {
      // Skip singoli item non disponibili senza bloccare l'intera timeline utente.
    }
  }

  return {
    user,
    items,
  };
}

/**
 * Recupera i figli (commenti) di un commento dato, usando gli ID in `comment.kids`.
 *
 * @param {object} comment - Oggetto commento contenente la proprietà `kids` (array di ID)
 * @returns {Promise<Array<object>>} - Promise che risolve con array di commenti figli
 */
export async function getCommentChildren(comment) {
  if (!comment || !Array.isArray(comment.kids) || comment.kids.length === 0) {
    return [];
  }

  return getItemsByIds(comment.kids);
}
