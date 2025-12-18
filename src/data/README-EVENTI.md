# Gestione Eventi - Ki Aikido Prato

## Come aggiornare gli eventi

Gli eventi della homepage sono gestiti tramite il file `events.json` in questa cartella.

### Struttura di un evento

```json
{
  "id": 1,
  "title": "Titolo dell'evento",
  "date": "2026-01-04",
  "time": "10:00 - 18:00",
  "location": "Città (Provincia)",
  "description": "Descrizione breve dell'evento",
  "organizer": "Maestri/Insegnanti",
  "link": "https://link-per-info.it",
  "type": "seminario",
  "image": null
}
```

### Campi disponibili

- **id**: Numero identificativo univoco (incrementa per ogni nuovo evento)
- **title**: Titolo dell'evento
- **date**: Data nel formato `YYYY-MM-DD` (es: `2026-01-04`)
- **time**: Orario (es: `10:00 - 18:00` o `Da definire`)
- **location**: Luogo (es: `Collegno (TO)` o `Prato`)
- **description**: Descrizione breve e chiara dell'evento
- **organizer**: Chi organizza/insegna (opzionale)
- **link**: Link per maggiori informazioni
- **type**: Tipologia (`seminario`, `stage`, `esame`, ecc.)
- **image**: URL immagine (opzionale, per ora non utilizzato)

### Come aggiungere un nuovo evento

1. Apri il file `events.json`
2. Aggiungi un nuovo oggetto nell'array, separandolo con una virgola:

```json
[
  {
    "id": 1,
    "title": "Seminario Misogi con Maestri Domenico e Egidio",
    "date": "2026-01-04",
    ...
  },
  {
    "id": 2,
    "title": "NUOVO EVENTO",
    "date": "2026-02-15",
    "time": "09:00 - 17:00",
    "location": "Prato",
    "description": "Descrizione del nuovo evento",
    "organizer": "Maestro XY",
    "link": "https://www.kiaikidoprato.com/contatti.html",
    "type": "seminario",
    "image": null
  }
]
```

3. Salva il file

### Note importanti

- **Gli eventi passati vengono automaticamente nascosti** - il sistema mostra solo eventi futuri
- Gli eventi vengono ordinati automaticamente per data
- Vengono mostrati massimo 5 eventi futuri
- La data deve essere nel formato corretto `YYYY-MM-DD` per funzionare
- Assicurati che il JSON sia valido (virgole, parentesi graffe corrette)

### Esempio da email della Ki no Kenkyukai

Quando ricevi una email tipo:

```
Newsletter di Dicembre 2025

Seminario a Collegno (TO), domenica 4 gennaio 2026, 
coi Maestri Domenico e Egidio.
```

Trasformala in:

```json
{
  "id": 2,
  "title": "Seminario con Maestri Domenico e Egidio",
  "date": "2026-01-04",
  "time": "Da definire",
  "location": "Collegno (TO)",
  "description": "Seminario di Ki-Aikido con i Maestri della Ki no Kenkyukai.",
  "organizer": "Maestri Domenico e Egidio",
  "link": "https://www.kinokenkyukai.it/seminari/",
  "type": "seminario",
  "image": null
}
```

### Validazione JSON

Prima di salvare, puoi verificare che il JSON sia valido su: https://jsonlint.com/

### In futuro: automazione

Possibile sviluppo futuro:
- Script che legge automaticamente le email
- Backend per aggiungere eventi tramite form
- Integrazione con calendario Google
- Notifiche automatiche sui nuovi eventi

