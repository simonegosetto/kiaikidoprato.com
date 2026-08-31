/**
 * Ki-Aikido Prato — Backend eventi (Google Apps Script Web App) — API v1
 * ---------------------------------------------------------------------
 * DEPLOY (istruzioni sintetiche):
 *  1. Crea un nuovo Google Sheet (es. "Eventi Ki-Aikido Prato").
 *  2. Dal foglio: Estensioni > Apps Script. Rinomina il file in "Codice.gs" e
 *     incolla qui tutto questo codice. Salva.
 *  3. Imposta la password admin: Impostazioni progetto (icona ingranaggio) >
 *     Proprieta script > Aggiungi proprieta: ADMIN_PASSWORD = <password scelta>.
 *     La password non deve MAI finire nel repository del sito.
 *  4. Esegui una volta a mano la funzione setup() (autorizza lo script quando
 *     richiesto): crea il foglio "Eventi" con le intestazioni e logga l'URL.
 *     Facoltativo: esegui importaSeed() per caricare i due eventi iniziali.
 *  5. Distribuisci > Nuova distribuzione > tipo "App web":
 *       - Esegui come: Me (il tuo account)
 *       - Chi ha accesso: Chiunque
 *     Copia l'URL che termina con /exec e mettilo in src/js/config.js
 *     (window.KIAIKIDO_CONFIG.eventsApiUrl).
 *  6. Verifica: apri <URL /exec>?action=ping -> {"ok":true,"version":"1.0"}
 *  NOTA: dopo ogni modifica al codice le modifiche NON sono attive finche non
 *  si pubblica una nuova versione: Distribuisci > Gestisci distribuzioni >
 *  matita > Versione: Nuova versione (mantiene lo stesso URL /exec).
 *  "Nuova distribuzione" invece genera un URL /exec DIVERSO: in quel caso va
 *  aggiornato anche src/js/config.js. Guida completa: docs/gestione-eventi.md
 *
 * VINCOLI DELLA PIATTAFORMA (rispettati dal contratto API v1):
 *  - Apps Script non gestisce le richieste OPTIONS: il client fa POST "simple
 *    request" con Content-Type text/plain e nessun header custom (il token
 *    viaggia nel body JSON, non in Authorization).
 *  - Non si possono restituire status HTTP diversi da 200/302: ogni risposta e
 *    JSON con il campo booleano "ok". Il client valuta payload.ok.
 */

/* ============================== COSTANTI ============================== */

var API_VERSION = '1.0';
var SHEET_NAME = 'Eventi';
var TIMEZONE = 'Europe/Rome';

// Ordine colonne del foglio: vincolante, non modificare.
var HEADERS = ['id', 'title', 'date', 'dateEnd', 'time', 'location', 'description',
               'organizer', 'link', 'type', 'image', 'published', 'updatedAt'];

// Colonne testuali contigue: da A (id) a K (image); L (published) resta booleana.
var COL_TESTO_INIZIO = 1;   // colonna A
var COL_TESTO_QUANTE = 11;  // A..K
var COL_UPDATED_AT = 13;    // colonna M

var TIPI_AMMESSI = ['seminario', 'stage', 'esame', 'evento'];
var TIPO_DEFAULT = 'evento';

// Lunghezze massime dei campi testo (troncamento silenzioso).
var LIMITI = {
    title: 200,
    time: 80,
    location: 250,
    description: 4000,
    organizer: 250,
    link: 600,
    image: 600
};

// Anti brute force: max 10 token errati in 15 minuti.
var MAX_TENTATIVI = 10;
var FINESTRA_TENTATIVI_SEC = 15 * 60;
var CHIAVE_TENTATIVI = 'kiaikido_tentativi_token';

var LOCK_TIMEOUT_MS = 10000;

// Eventi iniziali usati da importaSeed(): hardcodati per non dipendere da upload.
var SEED_EVENTI = [
    {
        id: 'evt_1',
        title: 'Seminario Misogi con Maestri Domenico e Egidio',
        date: '2026-01-04',
        dateEnd: '',
        time: 'Da definire',
        location: 'Collegno (TO)',
        description: 'Seminario speciale dedicato al Misogi per iniziare il nuovo anno con energia e concentrazione.',
        organizer: 'Maestri Domenico e Egidio',
        link: 'https://knkitalia.it/index.php/seminari/',
        type: 'seminario',
        image: 'https://knkitalia.it/wp-content/uploads/2025/12/04GennMisogi-scaled.jpeg',
        published: true
    },
    {
        id: 'evt_2',
        title: 'Aikido Memorial: Doshu Yoshigasaki Shihan Ruglioni',
        date: '2026-02-15',
        dateEnd: '',
        time: '9:30 - 17:00',
        location: 'Palestra Kodokan, Via Magellano 11, Firenze',
        description: 'Seminario di Aikido in memoria del Doshu Kenjiro Yoshigasaki e dello Shihan Beppe Ruglioni. Sessioni condotte da Piero Messeri (10:00-11:00), Paolo Riccardi (11:00-12:00), Simone Cappelli (15:00-16:00) e Corrado Calossi (16:00-17:00). Contributo 40 euro, prenotazione obbligatoria.',
        organizer: 'Ki No Kenkyukai Italia',
        link: 'https://knkitalia.it/index.php/seminari/',
        type: 'seminario',
        image: 'https://knkitalia.it/wp-content/uploads/2026/01/Memorial-2026.png',
        published: true
    }
];

/* ============================== ROUTING ============================== */

/**
 * GET: ?action=ping | ?action=list | ?action=listAll&token=<password>
 */
function doGet(e) {
    try {
        var params = (e && e.parameter) || {};
        var action = String(params.action || '').trim();

        if (action === 'ping') {
            return jsonOk_({ version: API_VERSION });
        }

        if (action === 'list') {
            // Pubblico: solo published=true, ordinati per data crescente.
            var pubblici = readEvents_().filter(function (ev) { return ev.published === true; });
            return jsonOk_({ events: ordinaPerData_(pubblici) });
        }

        if (action === 'listAll') {
            var negato = autorizza_(params.token);
            if (negato) { return negato; }
            return jsonOk_({ events: ordinaPerData_(readEvents_()) });
        }

        return jsonErr_('VALIDATION', 'Azione non riconosciuta. Azioni disponibili: ping, list, listAll.');
    } catch (err) {
        return rispostaEccezione_(err);
    }
}

/**
 * POST (body JSON, Content-Type text/plain): login | create | update | delete
 */
function doPost(e) {
    try {
        var body = leggiCorpo_(e);
        var action = String(body.action || '').trim();

        if (action !== 'login' && action !== 'create' && action !== 'update' && action !== 'delete') {
            return jsonErr_('VALIDATION', 'Azione non riconosciuta. Azioni disponibili: login, create, update, delete.');
        }

        var negato = autorizza_(body.token);
        if (negato) { return negato; }

        if (action === 'login') {
            return jsonOk_();
        }

        if (action === 'create') {
            return jsonOk_({ event: createEvent_(estraiEvento_(body)) });
        }

        if (action === 'update') {
            return jsonOk_({ event: updateEvent_(estraiEvento_(body)) });
        }

        // delete
        var id = pulisciTesto_(body.id, 80);
        if (!id) { return jsonErr_('VALIDATION', 'Manca l\'id dell\'evento da eliminare.'); }
        return jsonOk_({ id: deleteEvent_(id) });
    } catch (err) {
        return rispostaEccezione_(err);
    }
}

/* ============================ RISPOSTE JSON ============================ */

function json_(payload) {
    return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
}

function jsonOk_(extra) {
    var payload = { ok: true };
    if (extra) {
        for (var k in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, k)) { payload[k] = extra[k]; }
        }
    }
    return json_(payload);
}

function jsonErr_(code, error) {
    return json_({ ok: false, code: code, error: error });
}

/** Errore applicativo con codice del contratto. */
function errore_(code, messaggio) {
    var err = new Error(messaggio);
    err.codice = code;
    return err;
}

/** Traduce qualsiasi eccezione in una risposta del contratto, senza stack trace. */
function rispostaEccezione_(err) {
    if (err && err.codice) {
        return jsonErr_(err.codice, err.message || 'Errore.');
    }
    // Lo stack finisce solo nei log del progetto, non nella risposta.
    try { console.error('Errore non gestito: ' + (err && err.stack ? err.stack : err)); } catch (ignora) {}
    return jsonErr_('SERVER', 'Errore interno del server. Riprova tra qualche istante.');
}

/* ============================== CORPO POST ============================== */

function leggiCorpo_(e) {
    if (e && e.postData && e.postData.contents) {
        var testo = String(e.postData.contents).trim();
        if (!testo) { throw errore_('VALIDATION', 'Corpo della richiesta vuoto.'); }
        try {
            var parsed = JSON.parse(testo);
            if (!parsed || typeof parsed !== 'object') { throw new Error('non oggetto'); }
            return parsed;
        } catch (ignora) {
            throw errore_('VALIDATION', 'Corpo della richiesta non valido: atteso un oggetto JSON.');
        }
    }
    // Fallback: dati inviati come form-encoded.
    if (e && e.parameter && e.parameter.action) { return e.parameter; }
    throw errore_('VALIDATION', 'Corpo della richiesta mancante.');
}

function estraiEvento_(body) {
    var raw = body.event;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (ignora) {
            throw errore_('VALIDATION', 'Campo "event" non valido: atteso un oggetto JSON.');
        }
    }
    if (!raw || typeof raw !== 'object') {
        throw errore_('VALIDATION', 'Dati dell\'evento mancanti.');
    }
    return raw;
}

/* ============================ AUTENTICAZIONE ============================ */

/**
 * Confronta il token con la Script Property ADMIN_PASSWORD.
 * Confronto a tempo costante: stessa lunghezza + XOR sui char code.
 */
function checkToken_(token) {
    var attesa = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (!attesa) {
        // Property non configurata: nessun accesso possibile.
        try { console.warn('ADMIN_PASSWORD non configurata nelle Proprieta script.'); } catch (ignora) {}
        return false;
    }
    var fornito = (token === null || token === undefined) ? '' : String(token);
    if (!fornito) { return false; }
    return confrontoCostante_(fornito, String(attesa));
}

function confrontoCostante_(a, b) {
    if (a.length !== b.length) { return false; }
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
        diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
    }
    return diff === 0;
}

/**
 * Restituisce null se il token e valido, altrimenti la risposta di errore
 * (UNAUTHORIZED oppure RATE_LIMIT).
 * Il token viene verificato PRIMA di guardare il contatore: il contatore
 * rallenta soltanto i tentativi falliti e non puo mai bloccare chi conosce la
 * password (altrimenti chiunque, sparando password sbagliate, chiuderebbe
 * fuori gli istruttori). Il contatore vive nella cache di script, quindi e
 * globale: incremento e lettura avvengono sotto lock di script per non essere
 * aggirabili con richieste concorrenti. Se il lock non si ottiene si prosegue
 * comunque: meglio un conteggio imperfetto che un istruttore chiuso fuori.
 */
function autorizza_(token) {
    var cache = CacheService.getScriptCache();
    var lock = LockService.getScriptLock();
    var bloccato = false;
    try { bloccato = lock.tryLock(LOCK_TIMEOUT_MS); } catch (ignora) { bloccato = false; }

    try {
        // 1) Password corretta: contatore azzerato e accesso consentito SEMPRE.
        if (checkToken_(token)) {
            cache.remove(CHIAVE_TENTATIVI);
            return null;
        }

        // 2) Password sbagliata: incrementa e decidi in base alla soglia.
        var tentativi = parseInt(cache.get(CHIAVE_TENTATIVI) || '0', 10);
        if (isNaN(tentativi) || tentativi < 0) { tentativi = 0; }
        tentativi += 1;
        cache.put(CHIAVE_TENTATIVI, String(tentativi), FINESTRA_TENTATIVI_SEC);

        if (tentativi >= MAX_TENTATIVI) {
            return jsonErr_('RATE_LIMIT', 'Troppi tentativi di accesso non validi. Attendi qualche minuto e riprova.');
        }
        return jsonErr_('UNAUTHORIZED', 'Password non valida.');
    } finally {
        // Rilasciato prima del return: nessun deadlock con conLock_().
        if (bloccato) { lock.releaseLock(); }
    }
}

/* =============================== FOGLIO =============================== */

/**
 * Apre il foglio "Eventi" in SOLA LETTURA: nessuna scrittura, cosi le GET
 * pubbliche non generano voci nella cronologia versioni ne corrono con i
 * salvataggi degli istruttori. Ritorna null se il foglio non esiste ancora
 * (setup() mai eseguito).
 */
function getSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        throw errore_('SERVER', 'Script non collegato a nessun Google Sheet.');
    }
    return ss.getSheetByName(SHEET_NAME);
}

/**
 * Setup/scrittura (da usare solo nei percorsi che scrivono): apre o crea il
 * foglio "Eventi", garantisce le intestazioni, congela la riga 1 e forza a
 * testo semplice tutte le colonne testuali, cosi Sheets non converte date,
 * orari ("15:00") o numeri ("9.30") in valori tipizzati.
 */
function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
        throw errore_('SERVER', 'Script non collegato a nessun Google Sheet.');
    }

    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getMaxColumns() < HEADERS.length) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
    }

    // Se sono state eliminate tutte le righe dati resta solo l'intestazione:
    // ripristina la griglia, altrimenti setFrozenRows(1) e la formattazione
    // fallirebbero a ogni richiesta.
    if (sheet.getMaxRows() < 2) {
        sheet.insertRowsAfter(1, 100);
    }

    var intestazioni = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    var daScrivere = false;
    for (var i = 0; i < HEADERS.length; i++) {
        if (String(intestazioni[i] || '').trim() !== HEADERS[i]) { daScrivere = true; break; }
    }
    if (daScrivere) {
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    }

    if (sheet.getFrozenRows() < 1) {
        sheet.setFrozenRows(1);
    }

    // Tutte le colonne testuali come testo semplice ("@") per evitare
    // conversioni automatiche: A..K (id..image) e M (updatedAt). Fuori solo
    // L (published), che resta booleana.
    var righeDati = sheet.getMaxRows() - 1;
    sheet.getRange(2, COL_TESTO_INIZIO, righeDati, COL_TESTO_QUANTE).setNumberFormat('@');
    sheet.getRange(2, COL_UPDATED_AT, righeDati, 1).setNumberFormat('@');

    return sheet;
}

/**
 * Legge il foglio e mappa le righe su oggetti Event normalizzati.
 */
function readEvents_() {
    var sheet = getSheet_();
    // Foglio non ancora creato (prima di setup()): lista vuota, non un errore.
    if (!sheet) { return []; }
    var ultimaRiga = sheet.getLastRow();
    if (ultimaRiga < 2) { return []; }

    var valori = sheet.getRange(2, 1, ultimaRiga - 1, HEADERS.length).getValues();
    var eventi = [];

    for (var i = 0; i < valori.length; i++) {
        var r = valori[i];
        var id = pulisciTesto_(r[0], 80);
        if (!id) { continue; } // riga vuota o residua

        eventi.push({
            id: id,
            title: pulisciTesto_(r[1], LIMITI.title),
            date: normalizzaData_(r[2]),
            dateEnd: normalizzaData_(r[3]),
            time: pulisciTesto_(r[4], LIMITI.time),
            location: pulisciTesto_(r[5], LIMITI.location),
            description: pulisciTesto_(r[6], LIMITI.description),
            organizer: pulisciTesto_(r[7], LIMITI.organizer),
            link: pulisciTesto_(r[8], LIMITI.link),
            type: normalizzaTipo_(r[9]),
            image: pulisciTesto_(r[10], LIMITI.image),
            published: normalizzaBooleano_(r[11]),
            updatedAt: normalizzaDataOra_(r[12])
        });
    }

    return eventi;
}

function rigaDaEvento_(ev) {
    return [ev.id, ev.title, ev.date, ev.dateEnd, ev.time, ev.location, ev.description,
            ev.organizer, ev.link, ev.type, ev.image, ev.published, ev.updatedAt];
}

/** Cerca la riga (1-based) di un id; -1 se assente. */
function trovaRiga_(sheet, id) {
    var ultimaRiga = sheet.getLastRow();
    if (ultimaRiga < 2) { return -1; }
    var ids = sheet.getRange(2, 1, ultimaRiga - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
        if (pulisciTesto_(ids[i][0], 80) === id) { return i + 2; }
    }
    return -1;
}

/** Id progressivo lato server: evt_<n+1>, con fallback su timestamp. */
function generaId_(sheet) {
    var ultimaRiga = sheet.getLastRow();
    var massimo = 0;
    var usati = {};

    if (ultimaRiga >= 2) {
        var ids = sheet.getRange(2, 1, ultimaRiga - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
            var id = pulisciTesto_(ids[i][0], 80);
            if (!id) { continue; }
            usati[id] = true;
            var m = /^evt_(\d+)$/.exec(id);
            if (m) {
                var n = parseInt(m[1], 10);
                if (!isNaN(n) && n > massimo) { massimo = n; }
            }
        }
    }

    var candidato = 'evt_' + (massimo + 1);
    if (usati[candidato]) { candidato = 'evt_' + Date.now(); }
    return candidato;
}

/* ============================== SCRITTURE ============================== */

/** Tutte le scritture passano da qui: lock di script per evitare corse. */
function conLock_(operazione) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
        throw errore_('SERVER', 'Il foglio e occupato da un\'altra modifica. Riprova tra qualche istante.');
    }
    try {
        return operazione();
    } finally {
        lock.releaseLock();
    }
}

function createEvent_(raw) {
    var evento = validateEvent_(raw);
    return conLock_(function () {
        var sheet = ensureSheet_();
        evento.id = generaId_(sheet);
        evento.updatedAt = adessoIso_();
        sheet.appendRow(rigaDaEvento_(evento));
        return evento;
    });
}

function updateEvent_(raw) {
    var id = pulisciTesto_(raw.id, 80);
    if (!id) { throw errore_('VALIDATION', 'Manca l\'id dell\'evento da modificare.'); }

    var evento = validateEvent_(raw);
    evento.id = id;

    return conLock_(function () {
        var sheet = ensureSheet_();
        var riga = trovaRiga_(sheet, id);
        if (riga === -1) {
            throw errore_('NOT_FOUND', 'Evento non trovato: ' + id);
        }
        evento.updatedAt = adessoIso_();
        sheet.getRange(riga, 1, 1, HEADERS.length).setValues([rigaDaEvento_(evento)]);
        return evento;
    });
}

function deleteEvent_(id) {
    return conLock_(function () {
        var sheet = ensureSheet_();
        var riga = trovaRiga_(sheet, id);
        if (riga === -1) {
            throw errore_('NOT_FOUND', 'Evento non trovato: ' + id);
        }
        sheet.deleteRow(riga);
        return id;
    });
}

/* ============================== VALIDAZIONE ============================== */

/**
 * Valida e normalizza i dati in arrivo. Solleva errori VALIDATION con
 * messaggi in italiano. Restituisce un Event completo (id/updatedAt vuoti:
 * li scrive il server).
 */
function validateEvent_(raw) {
    if (!raw || typeof raw !== 'object') {
        throw errore_('VALIDATION', 'Dati dell\'evento mancanti.');
    }

    var title = pulisciTesto_(raw.title, LIMITI.title);
    if (!title) {
        throw errore_('VALIDATION', 'Il titolo e obbligatorio.');
    }

    var date = pulisciTesto_(raw.date, 32);
    if (!date) {
        throw errore_('VALIDATION', 'La data di inizio e obbligatoria.');
    }
    date = normalizzaData_(date);
    if (!isDataIso_(date)) {
        throw errore_('VALIDATION', 'La data di inizio deve essere una data valida nel formato AAAA-MM-GG.');
    }

    var dateEnd = normalizzaData_(pulisciTesto_(raw.dateEnd, 32));
    if (dateEnd) {
        if (!isDataIso_(dateEnd)) {
            throw errore_('VALIDATION', 'La data di fine deve essere una data valida nel formato AAAA-MM-GG.');
        }
        if (dateEnd < date) {
            throw errore_('VALIDATION', 'La data di fine non puo essere precedente alla data di inizio.');
        }
    }

    var tipoRichiesto = pulisciTesto_(raw.type, 40).toLowerCase();
    var type = TIPO_DEFAULT;
    if (tipoRichiesto) {
        if (TIPI_AMMESSI.indexOf(tipoRichiesto) === -1) {
            throw errore_('VALIDATION', 'Tipo evento non valido. Valori ammessi: ' + TIPI_AMMESSI.join(', ') + '.');
        }
        type = tipoRichiesto;
    }

    return {
        id: '',
        title: title,
        date: date,
        dateEnd: dateEnd,
        time: pulisciTesto_(raw.time, LIMITI.time),
        location: pulisciTesto_(raw.location, LIMITI.location),
        description: pulisciTesto_(raw.description, LIMITI.description),
        organizer: pulisciTesto_(raw.organizer, LIMITI.organizer),
        link: validaUrl_(raw.link, 'link', LIMITI.link),
        type: type,
        image: validaUrl_(raw.image, 'immagine', LIMITI.image),
        published: normalizzaBooleano_(raw.published),
        updatedAt: ''
    };
}

/** URL ammesso solo se http:// o https://; stringa vuota consentita. */
function validaUrl_(valore, etichetta, limite) {
    var url = pulisciTesto_(valore, limite);
    if (!url) { return ''; }
    if (!/^https?:\/\/\S+/i.test(url)) {
        throw errore_('VALIDATION', 'Il campo ' + etichetta + ' deve essere un indirizzo che inizia con http:// o https://');
    }
    return url;
}

function isDataIso_(valore) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valore)) { return false; }
    var parti = valore.split('-');
    var anno = parseInt(parti[0], 10);
    var mese = parseInt(parti[1], 10);
    var giorno = parseInt(parti[2], 10);
    var d = new Date(anno, mese - 1, giorno);
    return d.getFullYear() === anno && (d.getMonth() + 1) === mese && d.getDate() === giorno;
}

/* ============================ NORMALIZZAZIONE ============================ */

/** Rimuove tag HTML e caratteri di controllo, taglia alla lunghezza massima. */
function pulisciTesto_(valore, limite) {
    if (valore === null || valore === undefined) { return ''; }
    if (valore instanceof Date) { return normalizzaDataOra_(valore); }

    var testo = String(valore);
    testo = testo.replace(/<[^>]*>/g, '');               // strip tag HTML
    testo = testo.replace(/\r\n?/g, '\n');               // normalizza fine riga
    testo = testo.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''); // controlli
    testo = testo.trim();

    var max = limite || 500;
    if (testo.length > max) { testo = testo.substring(0, max).trim(); }
    return testo;
}

/** 'YYYY-MM-DD' anche se Sheets ha convertito la cella in Date. */
function normalizzaData_(valore) {
    if (valore === null || valore === undefined || valore === '') { return ''; }
    if (valore instanceof Date) {
        return Utilities.formatDate(valore, TIMEZONE, 'yyyy-MM-dd');
    }
    var testo = String(valore).trim();
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(testo);   // taglia eventuale parte orario
    if (m) { return m[1]; }
    // ISO senza zeri iniziali scritto a mano nel foglio ("2026-2-15").
    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(testo);
    if (iso) {
        return iso[1] + '-' + due_(iso[2]) + '-' + due_(iso[3]);
    }
    // Formato italiano GG/MM/AAAA scritto a mano nel foglio.
    var it = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(testo);
    if (it) {
        return it[3] + '-' + due_(it[2]) + '-' + due_(it[1]);
    }
    return testo;
}

function normalizzaDataOra_(valore) {
    if (valore === null || valore === undefined || valore === '') { return ''; }
    if (valore instanceof Date) {
        return Utilities.formatDate(valore, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    }
    return String(valore).trim();
}

/** Accetta booleani, "TRUE"/"SI"/"1"/"VERO" e affini. */
function normalizzaBooleano_(valore) {
    if (valore === true) { return true; }
    if (valore === false || valore === null || valore === undefined || valore === '') { return false; }
    if (typeof valore === 'number') { return valore === 1; }
    var t = String(valore).trim().toUpperCase();
    return t === 'TRUE' || t === 'SI' || t === 'SÌ' || t === '1' || t === 'VERO' || t === 'YES' || t === 'X';
}

function normalizzaTipo_(valore) {
    var t = pulisciTesto_(valore, 40).toLowerCase();
    return TIPI_AMMESSI.indexOf(t) === -1 ? TIPO_DEFAULT : t;
}

function due_(n) {
    var s = String(n);
    return s.length === 1 ? '0' + s : s;
}

function adessoIso_() {
    return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/** Ordina per data crescente, a parita di data per titolo. */
function ordinaPerData_(eventi) {
    return eventi.sort(function (a, b) {
        if (a.date === b.date) {
            return a.title < b.title ? -1 : (a.title > b.title ? 1 : 0);
        }
        return a.date < b.date ? -1 : 1;
    });
}

/* ======================== UTILITY DA EDITOR ======================== */

/**
 * Da eseguire a mano dall'editor: crea/allinea il foglio "Eventi" e logga
 * l'URL del documento.
 */
function setup() {
    var sheet = ensureSheet_();
    var url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    var configurata = !!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');

    Logger.log('Foglio "%s" pronto (%s righe dati).', SHEET_NAME, Math.max(sheet.getLastRow() - 1, 0));
    Logger.log('URL foglio: %s', url);
    Logger.log('ADMIN_PASSWORD %s', configurata
        ? 'configurata correttamente.'
        : 'NON configurata: aggiungila in Impostazioni progetto > Proprieta script.');
    return url;
}

/**
 * Da eseguire a mano dall'editor: importa gli eventi iniziali (SEED_EVENTI).
 * Salta gli eventi il cui id e gia presente nel foglio.
 */
function importaSeed() {
    return conLock_(function () {
        var sheet = ensureSheet_();
        var esistenti = {};
        readEvents_().forEach(function (ev) { esistenti[ev.id] = true; });

        var righe = [];
        var importati = [];
        var saltati = [];

        SEED_EVENTI.forEach(function (seme) {
            if (esistenti[seme.id]) { saltati.push(seme.id); return; }
            var evento = validateEvent_(seme);
            evento.id = pulisciTesto_(seme.id, 80) || generaId_(sheet);
            evento.updatedAt = adessoIso_();
            righe.push(rigaDaEvento_(evento));
            importati.push(evento.id);
        });

        if (righe.length) {
            sheet.getRange(sheet.getLastRow() + 1, 1, righe.length, HEADERS.length).setValues(righe);
        }

        Logger.log('Seed importati: %s | gia presenti: %s',
            importati.join(', ') || 'nessuno',
            saltati.join(', ') || 'nessuno');

        return { importati: importati, saltati: saltati };
    });
}
