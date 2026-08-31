// ===================================
// Ki-Aikido Prato - Gestione Eventi (area riservata)
// ===================================
// Parla con la Web App Apps Script definita in config.js (eventsApiUrl).
// Regole della piattaforma: POST come "simple request" (Content-Type
// text/plain, nessun header custom) e risposte sempre HTTP 200 con campo "ok".

// La password resta solo nella scheda aperta: chiudendo il browser va rifatto l'accesso
const TOKEN_KEY = 'kiaikido_admin_token';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const TIPI_VALIDI = ['seminario', 'stage', 'esame', 'evento'];

const ETICHETTE_TIPO = {
    seminario: 'Seminario',
    stage: 'Stage',
    esame: 'Esame',
    evento: 'Evento'
};

const CAMPI_INPUT = ['fTitle', 'fDate', 'fDateEnd', 'fTime', 'fLocation',
    'fDescription', 'fOrganizer', 'fType', 'fLink', 'fImage'];

const CAMPI_ERRORE = ['errTitle', 'errDate', 'errDateEnd', 'errTime', 'errLocation',
    'errDescription', 'errOrganizer', 'errType', 'errLink', 'errImage'];

const state = {
    apiUrl: '',
    eventi: [],
    idInModifica: null,
    eventoDaEliminare: null,
    timerFlash: null,
    formSporco: false
};

document.addEventListener('DOMContentLoaded', init);

// ===================================
// Avvio
// ===================================

function init() {
    const config = window.KIAIKIDO_CONFIG || {};
    state.apiUrl = typeof config.eventsApiUrl === 'string' ? config.eventsApiUrl.trim() : '';

    collegaEventi();

    if (!state.apiUrl) {
        mostraSchermata('login');
        bloccaLogin('Il calendario eventi non è ancora configurato: manca l\'indirizzo del foglio Google. '
            + 'Chiedi a chi gestisce il sito di completare il file di configurazione.');
        return;
    }

    // Se la password è già in memoria proviamo a entrare direttamente
    if (leggiToken()) {
        mostraSchermata('list');
        caricaEventi();
        return;
    }

    mostraSchermata('login');
    el('loginPassword').focus();
}

function collegaEventi() {
    el('loginForm').addEventListener('submit', gestisciLogin);
    el('btnLogout').addEventListener('click', esci);
    el('btnReload').addEventListener('click', () => caricaEventi());
    el('btnNew').addEventListener('click', () => apriForm(null));
    el('btnCancel').addEventListener('click', annullaForm);
    el('eventForm').addEventListener('submit', salvaEvento);
    el('fImage').addEventListener('input', aggiornaAnteprimaImmagine);
    el('btnDeleteCancel').addEventListener('click', chiudiConfermaEliminazione);
    el('btnDeleteConfirm').addEventListener('click', eliminaEvento);

    const anteprima = el('imagePreviewImg');
    anteprima.addEventListener('load', () => {
        anteprima.hidden = false;
        el('imagePreviewLabel').textContent = 'Anteprima dell\'immagine:';
    });
    anteprima.addEventListener('error', () => {
        anteprima.hidden = true;
        el('imagePreviewLabel').textContent = 'Non riesco a caricare questa immagine: controlla che l\'indirizzo sia giusto.';
    });

    // Modifiche non salvate: serve alla conferma su "Annulla"
    CAMPI_INPUT.forEach((id) => {
        const campo = el(id);
        if (!campo) return;
        campo.addEventListener('input', segnaFormSporco);
        campo.addEventListener('change', segnaFormSporco);
    });
    // La checkbox Pubblicato non fa parte di CAMPI_INPUT
    el('fPublished').addEventListener('change', segnaFormSporco);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !el('deleteModal').hidden) chiudiConfermaEliminazione();
    });
}

// ===================================
// Utility
// ===================================

function el(id) {
    return document.getElementById(id);
}

// Escape dei valori che arrivano dal foglio Google, per i pochi punti in cui
// costruiamo HTML invece di usare textContent
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Accetta solo URL assoluti http(s): qualsiasi altro schema viene ignorato
function urlSicuro(value) {
    const url = typeof value === 'string' ? value.trim() : '';
    return /^https?:\/\//i.test(url) ? url : '';
}

function testo(value) {
    return typeof value === 'string' ? value.trim() : '';
}

// Le date restano stringhe 'YYYY-MM-DD': niente new Date(), niente scarti di fuso
function isDataIso(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(testo(value));
}

function dataIso(value) {
    const v = testo(value).slice(0, 10);
    return isDataIso(v) ? v : '';
}

function dataOdierna() {
    const ora = new Date();
    const mese = String(ora.getMonth() + 1).padStart(2, '0');
    const giorno = String(ora.getDate()).padStart(2, '0');
    return ora.getFullYear() + '-' + mese + '-' + giorno;
}

// '2026-02-15' -> '15 febbraio 2026'
function formattaData(iso) {
    const v = dataIso(iso);
    if (!v) return '';
    const parti = v.split('-');
    const mese = MESI[parseInt(parti[1], 10) - 1] || '';
    return parseInt(parti[2], 10) + ' ' + mese + ' ' + parti[0];
}

// Intervallo leggibile: '15 - 16 febbraio 2026', '30 gennaio - 1 febbraio 2026'
function formattaPeriodo(inizio, fine) {
    const dal = dataIso(inizio);
    const al = dataIso(fine);
    if (!dal) return 'Data non indicata';
    if (!al || al === dal) return formattaData(dal);

    const a = dal.split('-');
    const b = al.split('-');
    const giornoA = parseInt(a[2], 10);
    const giornoB = parseInt(b[2], 10);
    const meseA = MESI[parseInt(a[1], 10) - 1] || '';
    const meseB = MESI[parseInt(b[1], 10) - 1] || '';

    if (a[0] === b[0] && a[1] === b[1]) return giornoA + ' - ' + giornoB + ' ' + meseA + ' ' + a[0];
    if (a[0] === b[0]) return giornoA + ' ' + meseA + ' - ' + giornoB + ' ' + meseB + ' ' + a[0];
    return formattaData(dal) + ' - ' + formattaData(al);
}

// Ultimo giorno dell'evento: serve per capire se è passato
function ultimoGiorno(evento) {
    return dataIso(evento.dateEnd) || dataIso(evento.date) || '';
}

function eventoPassato(evento) {
    const fine = ultimoGiorno(evento);
    return fine !== '' && fine < dataOdierna();
}

// Prima i prossimi (dal più vicino), poi i passati (dal più recente)
function ordinaEventi(eventi) {
    const futuri = [];
    const passati = [];

    eventi.forEach((evento) => {
        if (!evento) return;
        if (eventoPassato(evento)) passati.push(evento);
        else futuri.push(evento);
    });

    const chiave = (evento) => dataIso(evento.date) || '9999-12-31';
    futuri.sort((a, b) => chiave(a).localeCompare(chiave(b)));
    passati.sort((a, b) => chiave(b).localeCompare(chiave(a)));

    return futuri.concat(passati);
}

// ===================================
// Password (sessionStorage)
// ===================================

function leggiToken() {
    try {
        return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (errore) {
        // In navigazione privata sessionStorage può lanciare
        return '';
    }
}

function scriviToken(token) {
    try {
        sessionStorage.setItem(TOKEN_KEY, token);
    } catch (errore) {
        // Se non si può salvare la password resta valida solo per questa sessione in memoria
    }
}

function cancellaToken() {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
    } catch (errore) {
        // niente da fare
    }
}

// ===================================
// Chiamate all'API (Apps Script)
// ===================================

async function apiGet(querystring) {
    try {
        const risposta = await fetch(state.apiUrl + '?' + querystring, { cache: 'no-store' });
        return await risposta.json();
    } catch (errore) {
        return { ok: false, code: 'NETWORK' };
    }
}

// POST "simple request": nessun header custom, Content-Type text/plain
async function apiPost(dati) {
    try {
        const risposta = await fetch(state.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(dati)
        });
        return await risposta.json();
    } catch (errore) {
        return { ok: false, code: 'NETWORK' };
    }
}

// Traduce i codici del contratto in frasi comprensibili
function messaggioErrore(payload, contesto) {
    const codice = payload && payload.code ? String(payload.code) : '';

    if (codice === 'NETWORK') {
        return 'Non riesco a collegarmi: controlla la connessione a internet e riprova.';
    }
    if (codice === 'UNAUTHORIZED') {
        return contesto === 'login'
            ? 'Password errata. Controlla di averla scritta bene (attenzione alle maiuscole) e riprova.'
            : 'La password non è più valida o la sessione è scaduta: inseriscila di nuovo.';
    }
    if (codice === 'RATE_LIMIT') {
        return 'Sono stati fatti molti tentativi con la password sbagliata. Non c\'è nessun blocco a tempo e '
            + 'la password non è cambiata: quella giusta viene accettata subito. L\'unica differenza è che ogni '
            + 'tentativo errato risponde con un paio di secondi di ritardo: scrivila con calma e riprova.';
    }
    if (codice === 'NOT_FOUND') {
        return 'Questo evento non esiste più: forse lo ha già eliminato qualcun altro. Premi "Aggiorna elenco".';
    }
    if (payload && payload.error) return String(payload.error);
    if (codice === 'VALIDATION') return 'Alcuni dati non sono corretti: controlla i campi e riprova.';
    return 'Si è verificato un errore inatteso. Riprova tra qualche minuto.';
}

// Se la password non vale più (o l'accesso risulta bloccato) torniamo alla schermata di accesso.
// Nel login RATE_LIMIT resta invece un semplice errore nel box: qui ci arrivano solo le
// chiamate fatte con il token già in sessionStorage.
function gestisciSessioneScaduta(payload) {
    cancellaToken();
    state.eventi = [];
    mostraSchermata('login');
    bloccaLogin('');
    el('loginError').hidden = false;
    el('loginError').textContent = messaggioErrore(payload, 'sessione');
    el('loginPassword').value = '';
    el('loginPassword').focus();
}

// ===================================
// Schermate e messaggi
// ===================================

function mostraSchermata(nome) {
    el('screenLoading').hidden = true;
    el('screenLogin').hidden = nome !== 'login';
    el('screenList').hidden = nome !== 'list';
    el('screenForm').hidden = nome !== 'form';
    window.scrollTo(0, 0);
}

// Messaggio temporaneo in cima alla pagina (verde se tutto ok)
function mostraFlash(messaggio, tipo) {
    const box = el('adminFlash');
    box.className = 'admin-flash ' + (tipo === 'error' ? 'admin-flash-error' : 'admin-flash-success');
    box.hidden = false;
    box.textContent = messaggio;

    if (state.timerFlash) clearTimeout(state.timerFlash);
    state.timerFlash = setTimeout(() => { box.hidden = true; }, 6000);
}

function nascondiFlash() {
    if (state.timerFlash) clearTimeout(state.timerFlash);
    el('adminFlash').hidden = true;
}

function mostraStatoElenco(messaggio) {
    const box = el('listStatus');
    if (!messaggio) {
        box.hidden = true;
        box.textContent = '';
        return;
    }
    box.hidden = false;
    box.textContent = messaggio;
}

// Usata quando manca la configurazione: l'accesso non può funzionare
function bloccaLogin(messaggio) {
    const errore = el('loginError');
    if (messaggio) {
        errore.hidden = false;
        errore.textContent = messaggio;
        el('loginSubmit').disabled = true;
        el('loginPassword').disabled = true;
    } else {
        errore.hidden = true;
        el('loginSubmit').disabled = false;
        el('loginPassword').disabled = false;
    }
}

// ===================================
// Schermata 1: accesso
// ===================================

async function gestisciLogin(e) {
    e.preventDefault();
    nascondiFlash();

    const campo = el('loginPassword');
    const erroreCampo = el('loginPasswordError');
    const erroreBox = el('loginError');
    const bottone = el('loginSubmit');
    const password = campo.value;

    erroreBox.hidden = true;
    erroreCampo.hidden = true;
    campo.classList.remove('is-invalid');

    if (!password) {
        erroreCampo.textContent = 'Scrivi la password per entrare.';
        erroreCampo.hidden = false;
        campo.classList.add('is-invalid');
        campo.focus();
        return;
    }

    bottone.disabled = true;
    bottone.textContent = 'Controllo...';

    const payload = await apiPost({ action: 'login', token: password });

    bottone.disabled = false;
    bottone.textContent = 'Entra';

    if (!payload || payload.ok !== true) {
        erroreBox.hidden = false;
        erroreBox.textContent = messaggioErrore(payload, 'login');
        campo.classList.add('is-invalid');
        campo.select();
        return;
    }

    scriviToken(password);
    campo.value = '';
    mostraSchermata('list');
    caricaEventi();
}

function esci() {
    cancellaToken();
    state.eventi = [];
    state.idInModifica = null;
    el('eventsList').textContent = '';
    nascondiFlash();
    bloccaLogin('');
    el('loginError').hidden = true;
    mostraSchermata('login');
    el('loginPassword').focus();
}

// ===================================
// Schermata 2: elenco eventi
// ===================================

async function caricaEventi() {
    const token = leggiToken();
    if (!token) {
        mostraSchermata('login');
        return;
    }

    mostraStatoElenco('Sto caricando gli eventi...');
    el('btnReload').disabled = true;

    const payload = await apiGet('action=listAll&token=' + encodeURIComponent(token));

    el('btnReload').disabled = false;

    if (!payload || payload.ok !== true) {
        if (payload && (payload.code === 'UNAUTHORIZED' || payload.code === 'RATE_LIMIT')) {
            gestisciSessioneScaduta(payload);
            return;
        }
        const motivo = messaggioErrore(payload, 'elenco');
        mostraStatoElenco('Non ho caricato l\'elenco degli eventi. ' + motivo
            + ' Quando vuoi riprovare premi "Aggiorna elenco".');
        return;
    }

    state.eventi = Array.isArray(payload.events) ? payload.events : [];
    disegnaElenco();
}

function disegnaElenco() {
    const contenitore = el('eventsList');
    contenitore.textContent = '';

    const ordinati = ordinaEventi(state.eventi);

    if (ordinati.length === 0) {
        mostraStatoElenco('Non c\'è ancora nessun evento. Premi "+ Nuovo evento" per aggiungere il primo.');
        return;
    }

    mostraStatoElenco('');
    ordinati.forEach((evento) => contenitore.appendChild(creaRigaEvento(evento)));
}

function creaRigaEvento(evento) {
    const passato = eventoPassato(evento);
    const pubblicato = evento.published === true || evento.published === 'true';

    const riga = document.createElement('article');
    riga.className = 'event-row' + (passato ? ' is-past' : '') + (!pubblicato ? ' is-draft' : '');

    const principale = document.createElement('div');
    principale.className = 'event-row-main';

    // Etichette visive: tipo, bozza, evento passato
    const badges = document.createElement('div');
    badges.className = 'event-row-badges';

    const tipo = testo(evento.type).toLowerCase();
    badges.appendChild(creaBadge(ETICHETTE_TIPO[tipo] || 'Evento', 'badge-type'));
    badges.appendChild(pubblicato
        ? creaBadge('Pubblicato', 'badge-published')
        : creaBadge('Bozza - non visibile sul sito', 'badge-draft'));
    if (passato) badges.appendChild(creaBadge('Già passato', 'badge-past'));
    principale.appendChild(badges);

    const titolo = document.createElement('h3');
    titolo.className = 'event-row-title';
    titolo.textContent = testo(evento.title) || '(evento senza titolo)';
    principale.appendChild(titolo);

    const data = document.createElement('p');
    data.className = 'event-row-date';
    data.textContent = formattaPeriodo(evento.date, evento.dateEnd);
    principale.appendChild(data);

    // Unico punto con HTML: le etichette in grassetto, i dati sono escapati
    const meta = document.createElement('p');
    meta.className = 'event-row-meta';
    meta.innerHTML = '<strong>Orario:</strong> ' + escapeHtml(testo(evento.time) || 'da definire')
        + ' &middot; <strong>Luogo:</strong> ' + escapeHtml(testo(evento.location) || 'da definire');
    principale.appendChild(meta);

    if (testo(evento.organizer)) {
        const organizzatore = document.createElement('p');
        organizzatore.className = 'event-row-meta';
        organizzatore.textContent = 'Insegnanti: ' + testo(evento.organizer);
        principale.appendChild(organizzatore);
    }

    riga.appendChild(principale);

    const azioni = document.createElement('div');
    azioni.className = 'event-row-actions';

    const modifica = document.createElement('button');
    modifica.type = 'button';
    modifica.className = 'btn btn-outline btn-sm';
    modifica.textContent = 'Modifica';
    modifica.addEventListener('click', () => apriForm(evento));
    azioni.appendChild(modifica);

    const elimina = document.createElement('button');
    elimina.type = 'button';
    elimina.className = 'btn btn-danger btn-sm';
    elimina.textContent = 'Elimina';
    elimina.addEventListener('click', () => apriConfermaEliminazione(evento));
    azioni.appendChild(elimina);

    riga.appendChild(azioni);
    return riga;
}

function creaBadge(etichetta, classe) {
    const span = document.createElement('span');
    span.className = 'badge ' + classe;
    span.textContent = etichetta;
    return span;
}

// ===================================
// Schermata 3: form nuovo / modifica
// ===================================

function apriForm(evento) {
    nascondiFlash();
    pulisciErroriForm();

    state.idInModifica = evento ? testo(evento.id) : null;
    el('formHeading').textContent = evento ? 'Modifica evento' : 'Nuovo evento';

    el('fTitle').value = evento ? testo(evento.title) : '';
    // Le date arrivano già come 'YYYY-MM-DD': vanno diritte nell'input type=date
    el('fDate').value = evento ? dataIso(evento.date) : '';
    el('fDateEnd').value = evento ? dataIso(evento.dateEnd) : '';
    el('fTime').value = evento ? testo(evento.time) : '';
    el('fLocation').value = evento ? testo(evento.location) : '';
    el('fDescription').value = evento ? testo(evento.description) : '';
    el('fOrganizer').value = evento ? testo(evento.organizer) : '';
    el('fLink').value = evento ? testo(evento.link) : '';
    el('fImage').value = evento ? testo(evento.image) : '';

    const tipo = evento ? testo(evento.type).toLowerCase() : 'seminario';
    el('fType').value = TIPI_VALIDI.indexOf(tipo) !== -1 ? tipo : 'evento';

    el('fPublished').checked = evento ? (evento.published === true || evento.published === 'true') : true;

    // I campi sono stati riempiti da noi: il form riparte "pulito"
    state.formSporco = false;

    aggiornaAnteprimaImmagine();
    mostraSchermata('form');
    el('fTitle').focus();
}

function segnaFormSporco() {
    state.formSporco = true;
}

function annullaForm() {
    if (state.formSporco
        && !window.confirm('Le modifiche non salvate andranno perse. Vuoi davvero uscire?')) {
        return;
    }

    state.formSporco = false;
    state.idInModifica = null;
    pulisciErroriForm();
    mostraSchermata('list');
}

function pulisciErroriForm() {
    CAMPI_ERRORE.forEach((id) => {
        const box = el(id);
        if (box) {
            box.hidden = true;
            box.textContent = '';
        }
    });
    CAMPI_INPUT.forEach((id) => {
        const campo = el(id);
        if (campo) {
            campo.classList.remove('is-invalid');
            campo.removeAttribute('aria-invalid');
            campo.removeAttribute('aria-describedby');
        }
    });
    el('formError').hidden = true;
}

function segnalaErrore(idErrore, idCampo, messaggio) {
    const box = el(idErrore);
    const campo = el(idCampo);
    box.hidden = false;
    box.textContent = messaggio;
    campo.classList.add('is-invalid');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', idErrore);
}

// Controlli lato client: messaggi sotto il campo, mai alert()
function validaForm() {
    pulisciErroriForm();
    const errori = [];

    const titolo = el('fTitle').value.trim();
    if (!titolo) {
        segnalaErrore('errTitle', 'fTitle', 'Scrivi il titolo dell\'evento: è obbligatorio.');
        errori.push('fTitle');
    }

    const inizio = el('fDate').value.trim();
    if (!inizio) {
        segnalaErrore('errDate', 'fDate', 'Indica la data di inizio: è obbligatoria.');
        errori.push('fDate');
    } else if (!isDataIso(inizio)) {
        segnalaErrore('errDate', 'fDate', 'La data di inizio non è valida: scegli un giorno dal calendario.');
        errori.push('fDate');
    }

    const fine = el('fDateEnd').value.trim();
    if (fine) {
        if (!isDataIso(fine)) {
            segnalaErrore('errDateEnd', 'fDateEnd', 'La data di fine non è valida: scegli un giorno dal calendario.');
            errori.push('fDateEnd');
        } else if (isDataIso(inizio) && fine < inizio) {
            segnalaErrore('errDateEnd', 'fDateEnd', 'La data di fine deve essere uguale o successiva alla data di inizio.');
            errori.push('fDateEnd');
        }
    }

    const link = el('fLink').value.trim();
    if (link && !/^https?:\/\//i.test(link)) {
        segnalaErrore('errLink', 'fLink', 'Il link deve iniziare con http:// oppure https:// (esempio: https://www.kiaikidoprato.com).');
        errori.push('fLink');
    }

    const immagine = el('fImage').value.trim();
    if (immagine && !/^https?:\/\//i.test(immagine)) {
        segnalaErrore('errImage', 'fImage', 'L\'indirizzo dell\'immagine deve iniziare con http:// oppure https:// .');
        errori.push('fImage');
    }

    if (errori.length > 0) {
        const primo = el(errori[0]);
        primo.focus();
        primo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
    }
    return true;
}

function leggiForm() {
    const tipo = el('fType').value;
    return {
        title: el('fTitle').value.trim(),
        date: el('fDate').value.trim(),
        dateEnd: el('fDateEnd').value.trim(),
        time: el('fTime').value.trim(),
        location: el('fLocation').value.trim(),
        description: el('fDescription').value.trim(),
        organizer: el('fOrganizer').value.trim(),
        link: el('fLink').value.trim(),
        type: TIPI_VALIDI.indexOf(tipo) !== -1 ? tipo : 'evento',
        image: el('fImage').value.trim(),
        published: el('fPublished').checked
    };
}

function aggiornaAnteprimaImmagine() {
    const box = el('imagePreview');
    const img = el('imagePreviewImg');
    const url = urlSicuro(el('fImage').value);

    if (!url) {
        box.hidden = true;
        img.hidden = true;
        img.removeAttribute('src');
        return;
    }

    el('imagePreviewLabel').textContent = 'Sto caricando l\'anteprima...';
    img.hidden = true;
    img.src = url;
    box.hidden = false;
}

async function salvaEvento(e) {
    e.preventDefault();
    nascondiFlash();

    if (!validaForm()) return;

    const token = leggiToken();
    if (!token) {
        gestisciSessioneScaduta({ code: 'UNAUTHORIZED' });
        return;
    }

    const bottone = el('btnSave');
    const bottoneAnnulla = el('btnCancel');
    const evento = leggiForm();
    const inModifica = state.idInModifica !== null && state.idInModifica !== '';

    if (inModifica) evento.id = state.idInModifica;

    bottone.disabled = true;
    bottoneAnnulla.disabled = true;
    bottone.textContent = 'Salvataggio...';

    const payload = await apiPost({
        action: inModifica ? 'update' : 'create',
        token: token,
        event: evento
    });

    bottone.disabled = false;
    bottoneAnnulla.disabled = false;
    bottone.textContent = 'Salva';

    if (!payload || payload.ok !== true) {
        if (payload && (payload.code === 'UNAUTHORIZED' || payload.code === 'RATE_LIMIT')) {
            gestisciSessioneScaduta(payload);
            return;
        }
        const box = el('formError');
        box.hidden = false;
        box.textContent = messaggioErrore(payload, 'salvataggio');
        box.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
    }

    const salvato = payload.event || evento;
    aggiornaInMemoria(salvato, inModifica);

    state.idInModifica = null;
    disegnaElenco();
    mostraSchermata('list');
    mostraFlash(inModifica
        ? 'Modifiche salvate: "' + testo(salvato.title) + '" è aggiornato.'
        : 'Evento creato: "' + testo(salvato.title) + '" è stato aggiunto.', 'success');
}

function aggiornaInMemoria(salvato, inModifica) {
    const id = testo(salvato.id);

    if (inModifica && id) {
        let trovato = false;
        state.eventi = state.eventi.map((esistente) => {
            if (testo(esistente.id) === id) {
                trovato = true;
                return salvato;
            }
            return esistente;
        });
        if (!trovato) state.eventi.push(salvato);
        return;
    }

    state.eventi.push(salvato);
}

// ===================================
// Eliminazione (con conferma che nomina l'evento)
// ===================================

function apriConfermaEliminazione(evento) {
    state.eventoDaEliminare = evento;
    el('deleteModalName').textContent = (testo(evento.title) || '(evento senza titolo)')
        + ' - ' + formattaPeriodo(evento.date, evento.dateEnd);
    el('deleteError').hidden = true;
    el('btnDeleteConfirm').disabled = false;
    el('btnDeleteConfirm').textContent = 'Sì, elimina';
    el('deleteModal').hidden = false;
    el('btnDeleteCancel').focus();
}

function chiudiConfermaEliminazione() {
    state.eventoDaEliminare = null;
    el('deleteModal').hidden = true;
}

async function eliminaEvento() {
    const evento = state.eventoDaEliminare;
    if (!evento) return;

    const token = leggiToken();
    if (!token) {
        chiudiConfermaEliminazione();
        gestisciSessioneScaduta({ code: 'UNAUTHORIZED' });
        return;
    }

    const bottone = el('btnDeleteConfirm');
    const titolo = testo(evento.title) || '(evento senza titolo)';

    bottone.disabled = true;
    bottone.textContent = 'Eliminazione...';

    const payload = await apiPost({ action: 'delete', token: token, id: testo(evento.id) });

    bottone.disabled = false;
    bottone.textContent = 'Sì, elimina';

    if (!payload || payload.ok !== true) {
        if (payload && (payload.code === 'UNAUTHORIZED' || payload.code === 'RATE_LIMIT')) {
            chiudiConfermaEliminazione();
            gestisciSessioneScaduta(payload);
            return;
        }
        const box = el('deleteError');
        box.hidden = false;
        box.textContent = messaggioErrore(payload, 'eliminazione');
        return;
    }

    const idEliminato = testo(payload.id) || testo(evento.id);
    state.eventi = state.eventi.filter((esistente) => testo(esistente.id) !== idEliminato);

    chiudiConfermaEliminazione();
    disegnaElenco();
    mostraSchermata('list');
    mostraFlash('Evento eliminato: "' + titolo + '" non è più sul sito.', 'success');
}
