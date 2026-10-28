Nella pagina "La mia pagina" (configurazione della pagina "Il prezzo giusto per te") aggiungi una sezione **Email**, in cui il referente personalizza le email che riceve il suo cliente. Salva i dati nel nostro database e **inviali all'API del sito insieme al resto della configurazione** (`PUT /devops/pagine/{referral_id}`), come chiave `email` allo stesso livello di `hero`, `colori` ecc. L'API li valida come gli altri campi: un errore torna con `422` e il percorso del campo nel messaggio, es. `"email.stima.titolo: massimo 80 caratteri."`.

Prima di scrivere codice esplora il progetto (come è fatta la sezione esistente, dove si salva la configurazione, come si gestiscono i form e la validazione) e segui le stesse convenzioni. Proponi un breve piano.

## Formato del blocco

Tutti i campi sono facoltativi; `null` o vuoto = testo/colore standard del sito.

```json
"email": {
  "colori": { "accento": "#ff6b01", "sfondo": "#f5f6fa", "card": "#ffffff" },
  "intestazione": "Andrea Rotaru · il tuo referente RC auto",
  "conferma": {
    "oggetto": "Abbiamo ricevuto la tua richiesta",
    "titolo": "Grazie, ci siamo quasi.",
    "messaggio": "Ti scrivo appena la stima è pronta."
  },
  "stima": {
    "oggetto": "La tua stima RC auto è pronta",
    "titolo": "Ecco la tua stima.",
    "messaggio": "Se vuoi, ne parliamo insieme: chiamami quando preferisci."
  },
  "firma": "Andrea Rotaru\nConsulente assicurativo"
}
```

| Campo | Regole | Cosa cambia / valore standard |
|---|---|---|
| `colori.accento` | `#rrggbb` | pulsanti, bordo in alto della card, ✓ dell'intestazione. Standard `#ff6b01` |
| `colori.sfondo` | `#rrggbb` | sfondo dell'email intorno alla card. Standard `#f5f6fa` |
| `colori.card` | `#rrggbb`, **solo colori chiari** | sfondo della card con il contenuto. Standard `#ffffff`. Il testo delle email è scuro: un colore scuro viene rifiutato con `422 "email.colori.card: scegli un colore chiaro, il testo delle email è scuro."` |
| `intestazione` | max 60, una riga | riga in alto accanto alla ✓. Standard "il prezzo giusto per te." |
| `conferma.oggetto` | max 80, una riga | oggetto dell'email inviata appena il cliente fa la richiesta. Standard "La tua richiesta è in elaborazione \| Polizze Express" |
| `conferma.titolo` | max 80, può andare a capo | titolo grande. Standard "La tua richiesta è in elaborazione." |
| `conferma.messaggio` | max 600, può andare a capo | paragrafo aggiunto sotto il titolo |
| `stima.oggetto` | max 80, una riga | oggetto dell'email con la stima. Standard "La Tua Stima \| Polizze Express" |
| `stima.titolo` | max 80, può andare a capo | titolo grande. Standard "Un intervallo orientativo per la tua RC auto." |
| `stima.messaggio` | max 600, può andare a capo | paragrafo aggiunto sotto il prezzo |
| `firma` | max 300, può andare a capo | firma in fondo, prima delle note legali |

Solo testo semplice, niente HTML. Evita di permettere testi come `javascript:` o `<script>`, che il firewall del sito blocca con un 403.

## Non modificabili

Scrivilo nell'editor, così il referente non li cerca:

- prezzo e targa
- l'avviso che la stima non è un preventivo
- i pulsanti per l'area personale
- link e password di attivazione
- i testi su consensi e privacy
- il piè di pagina legale di Alca Broker

## Interfaccia (in italiano)

- Sezione "Email" con tre parti: **Aspetto** (3 selettori colore + intestazione), **Email di conferma**, **Email con la stima**, più il campo **Firma**.
- Contatori di caratteri.
- Il testo standard come placeholder.
- Avviso se `colori.accento` è troppo chiaro: i pulsanti hanno il testo bianco.
- Un'anteprima approssimativa per ciascuna delle due email: card centrata larga 600 px su sfondo `colori.sfondo`, bordo in alto di 4 px in `colori.accento`, intestazione con quadratino ✓ in `accento`, titolo grande, messaggio, per la stima un riquadro con un prezzo d'esempio "480 €", un pulsante in `accento`, firma, note legali in piccolo. Più avanti il sito esporrà un endpoint di anteprima con l'HTML vero e l'anteprima userà quello: tieni il componente separato, così è facile sostituirlo.
- Validazione lato client con le stesse regole.

Alla fine dimmi dove sono salvati i dati e dammi una checklist di test manuale.
