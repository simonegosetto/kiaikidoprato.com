# Gestione degli eventi del sito

Questa guida spiega come funziona la sezione **Prossimi Eventi** di
[kiaikidoprato.com](https://www.kiaikidoprato.com/) e come si aggiornano gli eventi.

Gli eventi non sono più scritti dentro il sito: vivono in un **Google Sheet**, letto e scritto
da un piccolo programma Google (**Apps Script**) pubblicato come indirizzo web. Il sito legge
quell'indirizzo e mostra gli eventi futuri; gli istruttori li gestiscono da una pagina riservata.

```
 pagina riservata                    Google                          sito pubblico
 /admin/eventi.html  --- salva -->  Apps Script  <--- legge ---  home page, "Prossimi Eventi"
                                        |
                                   Google Sheet "Eventi"
```

La guida è divisa in due parti:

- **[Parte A — Setup tecnico](#parte-a--setup-tecnico-una-volta-sola)**: da fare **una volta sola**,
  serve chi mette in piedi il sistema (una mezz'ora di lavoro).
- **[Parte B — Uso quotidiano](#parte-b--uso-quotidiano)**: per gli istruttori che devono solo
  aggiungere o correggere un evento. Se il sistema è già attivo, **vai direttamente alla Parte B**.

In fondo: [Problemi frequenti](#problemi-frequenti) e [Sicurezza: cosa sapere](#sicurezza-cosa-sapere).

---

## Parte A — Setup tecnico (una volta sola)

Destinatario: chi gestisce il sito. Serve un account Google (meglio un account "del dojo" e non
personale: il foglio e lo script restano legati a quell'account).

File coinvolti nel repository:

| File | A cosa serve |
| --- | --- |
| `apps-script/Codice.gs` | il codice da incollare in Apps Script (il backend) |
| `apps-script/appsscript.json` | manifest del progetto Apps Script (fuso orario, tipo di accesso) |
| `apps-script/seed-eventi.json` | copia leggibile dei due eventi iniziali (solo riferimento, vedi passo 6) |
| `src/js/config.js` | dove si incolla l'indirizzo pubblico della Web App |
| `src/admin/eventi.html` + `src/js/admin-eventi.js` | la pagina riservata di gestione |
| `src/js/main.js` | legge gli eventi e disegna la sezione in home |

### 1. Creare il Google Sheet

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un **foglio vuoto**.
2. Rinominalo, per esempio `Eventi Ki-Aikido Prato`.
3. Non serve creare colonne o schede a mano: le crea lo script al passo 5.

### 2. Aprire l'editor Apps Script e incollare il codice

1. Dal foglio, menu **Estensioni › Apps Script**. Si apre una nuova scheda con l'editor.
2. In alto a sinistra dai un nome al progetto (clicca su *Progetto senza titolo*), per esempio
   `Eventi Ki-Aikido Prato`.
3. Nell'elenco **File** a sinistra c'è già un file `Codice.gs` con una funzione `myFunction`.
   **Seleziona tutto** il suo contenuto e cancellalo.
4. Apri `apps-script/Codice.gs` del repository, copia **tutto** il contenuto e incollalo al suo posto.
5. Salva con l'icona del dischetto (o `Ctrl+S` / `Cmd+S`).

> Il file `apps-script/appsscript.json` descrive le impostazioni del progetto (fuso orario
> `Europe/Rome`, accesso `ANYONE_ANONYMOUS`, esecuzione `USER_DEPLOYING`). Non è obbligatorio
> incollarlo: le stesse impostazioni si ottengono seguendo il passo 7. Se vuoi allinearlo comunque,
> attiva **Impostazioni progetto › Mostra il file manifest "appsscript.json" nell'editor** e
> sostituisci il contenuto del file che compare nell'elenco.

### 3. Impostare la password (Script Property `ADMIN_PASSWORD`)

La password degli istruttori **non sta nel sito e non sta nel repository**: sta solo qui.

1. Nella colonna di sinistra clicca **Impostazioni progetto** (icona dell'ingranaggio).
2. Scendi fino alla sezione **Proprietà script**.
3. Clicca **Aggiungi proprietà script**.
4. Compila:
   - **Proprietà**: `ADMIN_PASSWORD` (esattamente così, tutto maiuscolo con l'underscore)
   - **Valore**: la password che daranno gli istruttori
5. Clicca **Salva proprietà script**. Se non salvi, la password non esiste e nessuno potrà entrare.

Consigli sulla password: lunga (almeno 12 caratteri), senza spazi all'inizio o alla fine
(il confronto è esatto, uno spazio invisibile fa fallire l'accesso), diversa da altre password
del dojo. Comunicala a voce o con un messaggio privato, non scriverla nel repository.

### 4. Autorizzare lo script (la schermata che spaventa)

La prima volta che esegui una funzione, Google chiede il permesso di accedere al foglio.
È normale: lo "sviluppatore" non verificato sei tu.

1. Nella barra in alto dell'editor scegli la funzione `setup` dal menu a tendina e clicca **Esegui**.
2. Compare **Autorizzazione necessaria** › clicca **Rivedi autorizzazioni**.
3. Scegli il tuo account Google.
4. Compare **Google non ha verificato questa app**: clicca **Avanzate** (in basso a sinistra) e poi
   **Vai a Eventi Ki-Aikido Prato (non sicuro)**.
5. Clicca **Consenti**.

L'avviso "non sicuro" significa solo che l'app non è stata sottoposta a verifica Google: sei tu
l'autore e stai autorizzando il tuo stesso script sul tuo foglio.

### 5. Eseguire `setup()`

Se al passo 4 hai già eseguito `setup`, è fatto. Altrimenti: funzione `setup` › **Esegui**.

Cosa fa: crea (o allinea) la scheda **Eventi** con le intestazioni giuste, blocca la prima riga e
imposta come testo semplice tutte le colonne di testo (da `id` a `image`), così Sheets non converte
da solo né le date né gli orari: un `15:00` scritto nella colonna `time` resta il testo `15:00`.

Verifica nel pannello **Registro di esecuzione**, in basso: devi leggere il nome del foglio, il suo
URL e la riga `ADMIN_PASSWORD configurata correttamente.` Se invece dice
`ADMIN_PASSWORD NON configurata`, torna al passo 3 (probabilmente non hai premuto *Salva*).

Le colonne create nel foglio sono, in questo ordine:
`id`, `title`, `date`, `dateEnd`, `time`, `location`, `description`, `organizer`, `link`, `type`,
`image`, `published`, `updatedAt`. **Non spostarle e non rinominarle**: l'ordine è vincolante.

### 6. Eseguire `importaSeed()` (eventi iniziali)

Facoltativo ma consigliato, serve a partire con due eventi già dentro e verificare che tutto funzioni.

1. Scegli la funzione `importaSeed` dal menu a tendina › **Esegui**.
2. Nel registro leggerai quali id sono stati importati e quali erano già presenti.
3. Torna sul foglio: nella scheda **Eventi** vedrai due righe (`evt_1`, `evt_2`).

Puoi rieseguirla senza danni: gli eventi con un id già presente vengono saltati, non duplicati.

> **Attenzione:** `importaSeed()` legge gli eventi dalla costante `SEED_EVENTI` **dentro
> `Codice.gs`**, non dal file `apps-script/seed-eventi.json`. Quel JSON è solo una copia leggibile
> degli stessi dati, comoda da consultare; modificarlo non cambia nulla. È materiale di avvio
> "usa e getta": dopo il primo import gli eventi si gestiscono dalla pagina riservata.

### 7. Pubblicare la Web App (Deploy)

1. In alto a destra clicca **Distribuisci › Nuova distribuzione**.
2. Clicca l'ingranaggio **Seleziona tipo** e scegli **App web**.
3. Compila:
   - **Descrizione**: `v1 eventi` (un'etichetta qualsiasi, serve a te)
   - **Esegui come**: **Me (`tuo@indirizzo`)** — così lo script legge il foglio con i tuoi permessi
     e i visitatori non devono avere accesso al documento
   - **Chi ha accesso**: **Tutti** (in alcune versioni dell'interfaccia si chiama **Chiunque**) —
     è necessario perché il sito è pubblico e i visitatori non fanno login
4. Clicca **Distribuisci**. Se ricompare la richiesta di autorizzazione, ripeti il passo 4.
5. Copia l'**URL dell'app web**: è un indirizzo lungo che inizia con
   `https://script.google.com/macros/s/...` e **finisce con `/exec`**.

> Non usare l'URL che finisce con `/dev` (quello del "deployment di test"): funziona solo per te,
> mentre sei collegato al tuo account Google. Il sito pubblico ha bisogno di `/exec`.

**Verifica immediata**: incolla nel browser l'URL seguito da `?action=ping`, cioè
`https://script.google.com/macros/s/.../exec?action=ping`. Devi vedere:

```json
{"ok":true,"version":"1.0"}
```

Se vedi una pagina di errore o una richiesta di login, la distribuzione non è configurata come
"Esegui come: Me" + "Chi ha accesso: Tutti": torna al passo 3 di questa sezione.

### 8. Incollare l'URL in `src/js/config.js`

Apri `src/js/config.js` e metti l'URL tra le virgolette:

```js
window.KIAIKIDO_CONFIG = {
    eventsApiUrl: "https://script.google.com/macros/s/XXXXXXXX/exec"
};
```

Regole:

- l'indirizzo deve **finire con `/exec`**, senza `?action=...` e senza `/` finale;
- finché la stringa resta vuota, la home mostra "Il calendario eventi non è ancora configurato" e
  la pagina riservata blocca l'accesso: è il comportamento previsto, non un guasto;
- in questo file **non va mai la password**: `config.js` è scaricabile da chiunque visiti il sito.

### 9. Ripubblicare il sito

Carica online il contenuto di `src/` come fai di solito (deploy del sito statico). Devono finire
online, oltre alle pagine, anche: `src/js/config.js`, `src/js/main.js`, `src/admin/eventi.html`,
`src/js/admin-eventi.js`, `src/robots.txt`.

Verifiche finali:

1. Apri la home e scendi a **Prossimi Eventi**: devono comparire gli eventi futuri.
2. Apri `https://www.kiaikidoprato.com/admin/eventi.html`, fai login con la password del passo 3.
3. Crea un evento di prova, controlla che compaia in home, poi eliminalo.

### 10. Come aggiornare il codice del backend

Questo è il punto in cui si perde più tempo, quindi leggilo prima di modificare `Codice.gs`.

**Salvare il codice non basta.** L'indirizzo `/exec` non serve il codice che vedi nell'editor:
serve la **versione** congelata al momento della distribuzione. Se modifichi e salvi senza creare
una nuova versione, il sito continua a comportarsi esattamente come prima.

Procedura corretta (mantiene lo stesso URL `/exec`):

1. Modifica `Codice.gs` nell'editor e **salva**.
2. **Distribuisci › Gestisci distribuzioni**.
3. Seleziona la distribuzione esistente e clicca l'icona della **matita** (Modifica).
4. Nel campo **Versione** scegli **Nuova versione** (`New version`).
5. Clicca **Distribuisci**.
6. Ricontrolla con `?action=ping` e, se hai cambiato la versione dell'API, che il numero sia quello nuovo.

> ### ⚠️ Errore classico
>
> **1. "Ho corretto il codice ma il sito fa la stessa cosa."** Hai salvato senza creare una nuova
> versione del deployment. Rifai i passi 2–5 qui sopra scegliendo **Versione: Nuova versione**.
>
> **2. "Ho fatto una nuova distribuzione e ora il sito non mostra più gli eventi."**
> **Distribuisci › Nuova distribuzione** crea un URL `/exec` **diverso**, e `config.js` punta ancora
> a quello vecchio. Per aggiornare il codice usa sempre **Gestisci distribuzioni › matita › Nuova
> versione**. Se hai già creato una distribuzione nuova, copia il suo URL in `src/js/config.js` e
> ripubblica il sito.

Casi che **non** richiedono una nuova versione:

- **cambiare la password** (`ADMIN_PASSWORD` viene letta a ogni richiesta: basta salvare la proprietà);
- aggiungere, modificare o eliminare eventi (sono dati nel foglio, non codice).

Se qualcosa non torna, in Apps Script il pannello **Esecuzioni** mostra ogni chiamata ricevuta
(`doGet`, `doPost`) con l'eventuale errore: è il primo posto in cui guardare.

---

## Parte B — Uso quotidiano

Destinatario: gli istruttori. Non serve sapere niente di tecnico. Ti serve solo: l'indirizzo della
pagina e la password del dojo.

### Aprire la pagina di gestione

1. Vai su **https://www.kiaikidoprato.com/admin/eventi.html**
   (attenzione a `/admin/eventi.html`: la pagina non è collegata da nessun menu del sito, si apre
   solo scrivendo l'indirizzo).
2. Conviene **salvarla nei preferiti** del telefono o del computer, così non devi ricordarla.
3. Funziona anche da telefono: la pagina è pensata per lo schermo piccolo.

### Fare login

1. Scrivi la password nel campo **Password** e premi **Entra**.
2. Se è giusta, vedi subito l'elenco degli eventi.
3. La password resta valida finché non chiudi la scheda del browser. Quando hai finito, premi
   **Esci** (in alto a destra dell'elenco), soprattutto su un computer che usano anche altri.

Se non conosci la password, chiedila a chi gestisce il sito: non c'è un "password dimenticata".

### L'elenco degli eventi

Ogni evento è una scheda con delle etichette colorate:

- **Seminario / Stage / Esame / Evento** — il tipo che hai scelto;
- **Pubblicato** (verde) — è visibile sul sito;
- **Bozza – non visibile sul sito** (oro) — è salvato qui ma il pubblico non lo vede;
- **Già passato** (grigio) — la data è passata; resta in elenco per te, ma è sparito dalla home.

L'ordine è: prima i prossimi eventi (dal più vicino), poi quelli passati (dal più recente).
Il bottone **Aggiorna elenco** ricarica i dati: usalo se sospetti che qualcun altro abbia
modificato qualcosa mentre eri sulla pagina.

### Aggiungere un evento

1. Premi **+ Nuovo evento**.
2. Compila i campi (obbligatori solo **Titolo** e **Data di inizio**, quelli con l'asterisco rosso).
3. Premi **Salva**.
4. Torni all'elenco e in alto compare una riga verde di conferma.

### Modificare un evento

1. Trova l'evento nell'elenco e premi **Modifica**.
2. Cambia quello che serve e premi **Salva**.
3. Se hai cambiato idea, premi **Annulla**: non viene salvato niente. Se avevi già modificato
   qualcosa, il browser chiede prima una conferma ("Le modifiche non salvate andranno perse").

### Mettere un evento in bozza (o rimetterlo online)

Serve quando un evento è ancora incerto: la data non è confermata, mancano i dettagli, non vuoi
ancora annunciarlo.

1. **Modifica** l'evento.
2. In basso togli la spunta a **Pubblicato sul sito**.
3. **Salva**. L'evento prende l'etichetta oro *Bozza* e **spariscono le sue informazioni dal sito**,
   ma resta qui per te.
4. Quando è tutto pronto: **Modifica**, rimetti la spunta, **Salva**.

Mettere in bozza è quasi sempre meglio che eliminare: se un seminario viene rinviato, ti basterà
cambiare la data e ripubblicarlo.

### Eliminare un evento

1. Premi **Elimina** sulla scheda dell'evento.
2. Si apre una finestra che ti dice **quale** evento stai eliminando (titolo e data): rileggila.
3. Premi **Sì, elimina** per confermare, oppure **No, torna indietro**.

L'eliminazione **non si può annullare**: l'evento sparisce dal sito e da questo elenco.
Per un evento passato, di solito non serve fare niente: scompare da solo dalla home.

### Cosa significa ogni campo

| Campo | Cosa scrivere |
| --- | --- |
| **Titolo** * | Il nome dell'evento come si leggerà sul sito. Esempio: *Seminario di Ki-Aikido con Sensei Rossi*. |
| **Data di inizio** * | Il giorno in cui l'evento inizia. Scegli il giorno dal calendarietto, non scriverlo a mano. |
| **Data di fine** | **Solo** se l'evento dura più di un giorno (es. sabato e domenica). Se è di un giorno solo, lascia vuoto. |
| **Orario** | Testo libero: *9:30 - 17:00*, *dalle 15*, *Da definire*. Se lo lasci vuoto, sul sito compare "Da definire". |
| **Luogo** | Palestra, indirizzo, città. Esempio: *Palestra Shiro Saigo, Via ..., Prato*. |
| **Descrizione** | Qualche riga: programma, insegnanti delle varie sessioni, quota di partecipazione, se la prenotazione è obbligatoria, come iscriversi. Puoi **andare a capo**: le righe che scrivi qui restano separate anche sul sito, così puoi tenere il programma su più righe. È il testo che il visitatore legge quando apre la scheda dell'evento. |
| **Insegnanti / Organizzatore** | Chi conduce o chi organizza. Esempio: *Ki No Kenkyukai Italia* oppure *Piero Messeri*. |
| **Tipo di evento** | Solo un'etichetta per distinguerli: *Seminario*, *Stage*, *Esame*, *Evento (altro)*. Nel dubbio scegli *Evento (altro)*. |
| **Link per maggiori informazioni** | Indirizzo della pagina con i dettagli o del volantino online (es. la pagina dei seminari di knkitalia.it). Deve iniziare con `http://` o `https://`. Sul sito diventa il bottone **Maggiori Info**. |
| **Immagine / locandina** | Indirizzo internet dell'immagine (vedi sotto). In home la scheda dell'evento si apre sempre, anche senza immagine; se l'immagine c'è, si vede la locandina sopra la descrizione. |
| **Pubblicato sul sito** | Spuntato = lo vedono tutti. Non spuntato = bozza, lo vedi solo tu qui. |

\* campi obbligatori.

### Dove trovare l'URL della locandina

Qui **non si caricano file**: non puoi scegliere una foto dal telefono. Serve l'**indirizzo di
un'immagine già online**. Nella pratica:

- **La locandina è sul sito della Ki no Kenkyukai (o di un altro dojo)** — è il caso più comune.
  Apri la pagina, **tasto destro sull'immagine › Copia indirizzo immagine** (su Chrome:
  *Copia indirizzo immagine*; su Safari: *Copia indirizzo immagine*; su telefono: tieni premuto
  sull'immagine e scegli *Copia indirizzo immagine*). Poi incolla nel campo.
- **Come capire se l'indirizzo è quello giusto**: finisce con `.jpg`, `.jpeg`, `.png` o `.webp`
  (esempio: `https://knkitalia.it/wp-content/uploads/2026/01/Memorial-2026.png`). Se finisce con
  `.html` o è l'indirizzo della pagina, hai copiato il link della pagina, non dell'immagine.
- **Non funzionano** i link di condivisione di Google Drive, Dropbox, WeTransfer o WhatsApp:
  sono indirizzi di pagine, non di immagini, e restituiscono un riquadro vuoto.
- **Hai solo un file o un PDF?** Chiedi a chi gestisce il sito di pubblicare l'immagine e di darti
  l'indirizzo. In alternativa lascia il campo vuoto: l'evento funziona benissimo anche senza locandina.

**Controllo automatico**: appena incolli l'indirizzo, sotto al campo compare l'**anteprima**.
Se vedi l'immagine, è a posto. Se leggi *"Non riesco a caricare questa immagine"*, l'indirizzo non
va bene: non salvare così, sul sito si vedrebbe uno spazio vuoto.

### Quando si vedono le modifiche sul sito

Il salvataggio è immediato e vale per tutti. Sulla home, però, il sito mostra prima l'ultima copia
che aveva in memoria e poi si aggiorna da solo dopo qualche secondo. Quindi:

1. ricarica la home;
2. se l'evento nuovo non c'è, attendi un istante e ricarica di nuovo;
3. sul telefono può servire chiudere e riaprire il browser.

Ricorda anche che in home compaiono **solo gli eventi pubblicati e non ancora passati**, e al
massimo **cinque**: se ce ne sono di più, i successivi restano fuori finché i primi non passano.

---

## Problemi frequenti

### "Password non valida" / la password non funziona

1. Controlla le **maiuscole** e la lingua della tastiera. Riscrivila a mano invece di incollarla:
   copiando si porta dietro spazi invisibili, e il confronto è esatto.
2. Sei sicuro di usare la password **del foglio eventi**? Non è quella della mail del dojo.
3. Se non funziona a nessuno, chi gestisce il sito deve verificare che in Apps Script
   (**Impostazioni progetto › Proprietà script**) esista `ADMIN_PASSWORD` con il valore giusto **e
   che sia stato premuto Salva**. Senza quella proprietà, ogni tentativo risulta "Password non valida".
4. Cambiare la password non richiede di ripubblicare niente: si aggiorna la proprietà e basta.

### "Dopo 10 password sbagliate l'accesso si blocca per circa 15 minuti"

Dopo **10 password sbagliate** i nuovi tentativi vengono respinti per circa **15 minuti**, poi
l'accesso si riapre da solo. Il contatore è del sistema, non del singolo telefono: se un istruttore
sbaglia dieci volte, il messaggio compare anche agli altri.

**Chi ha la password giusta entra comunque.** La password corretta viene sempre accettata, anche
mentre il blocco è attivo, e azzera il contatore: il blocco rallenta solo chi tira a indovinare, non
chiude fuori gli istruttori. Quindi, se leggi questo messaggio, non tentare a caso: scrivi con calma
la password giusta. Se non te la ricordi, chiedila a chi gestisce il sito.

### Gli eventi non compaiono sul sito

Controlla nell'ordine:

1. L'evento ha la spunta **Pubblicato sul sito**? Se ha l'etichetta oro *Bozza*, il pubblico non lo vede.
2. La data è **passata**? Gli eventi scompaiono dalla home il giorno dopo la loro fine
   (per gli eventi di più giorni conta la *Data di fine*).
3. Ci sono già **cinque** eventi futuri più vicini nel tempo? La home ne mostra al massimo cinque.
4. Hai **ricaricato** la pagina? Vedi *"Quando si vedono le modifiche sul sito"*.
5. Se la home dice **"Il calendario eventi non è ancora configurato"**: è un problema tecnico, non tuo.
   Manca l'indirizzo in `src/js/config.js` (Parte A, passo 8) o il sito non è stato ripubblicato.
6. Se in home non compare niente ma nella pagina di gestione gli eventi ci sono, chi gestisce il sito
   deve provare `<URL>/exec?action=ping` e controllare **Esecuzioni** in Apps Script.

### L'immagine non si vede

- Nel modulo l'anteprima diceva *"Non riesco a caricare questa immagine"*? Allora l'indirizzo è
  sbagliato: rileggi *[Dove trovare l'URL della locandina](#dove-trovare-lurl-della-locandina)*.
- L'indirizzo inizia con `http://` invece di `https://`? Molti browser bloccano le immagini non
  sicure dentro un sito sicuro. Cerca la versione `https://`.
- L'indirizzo è quello di una **pagina** (Drive, Dropbox, un articolo) e non di un file immagine.
- L'immagine era online e ora non c'è più: chi l'aveva pubblicata l'ha rimossa. Serve un altro indirizzo.
- In home, se l'immagine non si carica, il sito **nasconde** il riquadro invece di mostrare un buco:
  la scheda dell'evento resta corretta, ma senza locandina.

### "Non riesco a collegarmi" / errore di rete

1. Controlla la tua connessione (prova ad aprire un altro sito).
2. Riprova dopo un minuto: a volte Google è momentaneamente lento e la richiesta scade.
3. Se l'errore continua per tutti, chi gestisce il sito deve verificare la Web App: apri
   `<URL>/exec?action=ping` nel browser e controlla di ricevere `{"ok":true,...}`. Se invece chiede
   un login o dà errore, la distribuzione è stata cancellata o riconfigurata male
   (Parte A, passo 7) — oppure `config.js` punta a un URL `/exec` vecchio (vedi *Errore classico*).

### "Il foglio è occupato da un'altra modifica"

Due persone stanno salvando nello stesso momento. Aspetta cinque secondi e premi di nuovo **Salva**:
non si perde niente e non si crea un doppione.

### "Questo evento non esiste più"

Qualcun altro lo ha eliminato mentre lo avevi aperto. Premi **Aggiorna elenco** per vedere la
situazione reale.

### La sessione "scade" e mi richiede la password

Succede se chiudi la scheda, se il browser scarta i dati della pagina o se la password è stata
cambiata. Rifai il login.

### Ho modificato il foglio Google a mano e adesso qualcosa non va

Usa la pagina di gestione, non il foglio: è il modo più semplice per scrivere i dati nel formato
giusto. Se però in una riga la colonna `date` contiene qualcosa che non è una data (per esempio
*"da definire"*), **quella singola riga viene ignorata sul sito**: la sezione eventi continua a
funzionare e gli altri eventi restano visibili, sparisce solo quell'evento (nella pagina di gestione
lo trovi comunque, con la scritta *Data non indicata*). Anche le date scritte a mano in modo
imperfetto vengono sistemate dal server: `2026-2-15` e `15/02/2026` valgono `2026-02-15`.

Quello che invece rompe le cose è **spostare le colonne o rinominare le intestazioni**: l'ordine è
vincolante. Per rimettere a posto una riga: scrivi la data nella forma `2026-02-15`, oppure cancella
la riga e ricrea l'evento dalla pagina di gestione.

---

## Sicurezza: cosa sapere

Il sistema è volutamente semplice. Ha senso per un calendario di eventi pubblici, ma è giusto sapere
esattamente cosa protegge e cosa no.

**1. La password è una sola e condivisa.**
Non esistono utenti singoli: chi conosce la password può aggiungere, modificare **ed eliminare**
qualsiasi evento. Non si può risalire a chi ha fatto una modifica (il foglio registra solo *quando*
è stata fatta, nella colonna `updatedAt`). Quindi: condividila solo con chi deve davvero gestire gli
eventi, mandala in privato e non scriverla mai nel repository del sito, in una mail collettiva o in
un gruppo pubblico.

**2. Chi conosce l'indirizzo `/exec` può leggere gli eventi pubblici.**
È inevitabile: quell'indirizzo lo usa il sito stesso, quindi è visibile in `src/js/config.js` a
chiunque visiti la home. Senza password si ottiene solo l'elenco degli eventi **già pubblicati** —
le stesse informazioni che si leggono sul sito, nessun dato in più. Le bozze e l'elenco completo
richiedono la password. Di conseguenza: **non scrivere nei campi degli eventi informazioni che non
vuoi rendere pubbliche** (numeri di cellulare privati, indirizzi di casa, dati di partecipanti).

**3. La pagina di gestione non è indicizzata, ma non è protetta a livello di server.**
`/admin/eventi.html` è esclusa dai motori di ricerca (`noindex` nella pagina e `Disallow` in
`src/robots.txt`) e non è collegata da nessun menu. Però resta una normale pagina del sito: chi ne
conosce o indovina l'indirizzo vede il modulo di login. **L'unica vera protezione è la password**,
insieme al rallentamento automatico dei tentativi sbagliati (dopo 10 password errate i nuovi
tentativi vengono respinti per circa 15 minuti, mentre la password giusta continua a passare).
Il file `robots.txt` chiede ai motori "seri" di non indicizzare, non impedisce l'accesso.

**4. La password passa dal browser a Google via HTTPS**, quindi è cifrata in transito. Va però tenuto
presente che, per caricare l'elenco completo, viene inviata dentro l'indirizzo della richiesta:
può quindi finire nella cronologia del browser e nei log di esecuzione del progetto Apps Script
(visibili solo al proprietario dell'account Google). In pratica:

- non usare la pagina di gestione da computer pubblici o condivisi;
- premi **Esci** quando hai finito (la password è tenuta solo nella scheda aperta e si cancella
  chiudendo il browser, ma è meglio uscire in modo esplicito);
- non lasciare il telefono sbloccato con la pagina aperta.

**5. Il foglio Google resta di chi lo ha creato.** Il backend gira "come" quell'account: se quella
persona lascia il dojo o perde l'accesso all'account, il sistema va rifatto. Meglio usare un account
del dojo e non personale, e tenere una copia dell'account e delle credenziali in un posto sicuro.

**6. Cambiate la password periodicamente.** È l'accortezza più utile di tutte. Consiglio pratico:

- ogni **6-12 mesi**;
- **subito** quando qualcuno smette di occuparsi degli eventi, o se la password è finita per sbaglio
  in un gruppo o in una mail;
- si cambia in un minuto: Apps Script › **Impostazioni progetto › Proprietà script** › modifica il
  valore di `ADMIN_PASSWORD` › **Salva proprietà script**. Non serve ripubblicare né il backend
  né il sito. Chi era collegato dovrà solo rifare il login.

**7. Nel repository non ci sono segreti, e va tenuto così.** `src/js/config.js` contiene solo
l'indirizzo pubblico `/exec`; la password vive esclusivamente nelle Proprietà script del progetto
Apps Script. Prima di ogni commit, verifica di non aver incollato una password in un file del sito.
