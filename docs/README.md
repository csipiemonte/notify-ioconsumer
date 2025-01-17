# Introduzione

*ioconsumer* è la componente che si occupa di inviare le notifiche sull'app IO agli utenti per conto di un determinato servizio. Le notifiche sull'app IO si basano sulle preferenze impostate dall'utente sull'app IO e non sono registrate sulla piattaforma Notify.

# Getting Started

Per rendere operativo il sistema occorre:
1. impostare gli opportuni valori delle variabili d'ambiente
1. editare il file di configurazione
1. avviare l'applicazione

## Prerequisites

* Componente Message broker attiva per leggere i messaggi e tracciare eventi
* Componente Events attiva per inserire su db gli eventi generati (opzionale)

## Configuration
La configurazione è basata su variabili d'ambiente e file di configurazione. Una variabile può essere presente sia su variabile d'ambiente sia nel file di conf specifico dell'ambiente che nel file di conf generico della componente. All'avvio della comopnente viene effettuato il merge di questi tre entry point. Le variabili se prensenti in più punti (file o env) vengono gestite con la seguente priorità (dalla più alta alla più bassa):
* variabile d'ambiente
* file di conf specifico dell'ambiente
* file di conf generico della componente

Le variabili d'ambiente da valorizzare sono:
* `ENVIRONMENT`: rappresenta l'ambiente di esecuzione (ad esempio dev, tst o prod). Serve per individuare il file di configurazione secondario.

I file di configurazione sono `conf/ioconsumer.json` e`conf/ioconsumer-{ENVIRONMENT}.json`. Ove lo stesso parametro sia presente su entrambi i file il valore in `conf/ioconsumer-{ENVIRONMENT}.json` ha la precedenza.

I principali attributi presenti nei file di configurazione sono elencati di seguito (per l'elenco completo visualizzare il contenuto dei file presenti nella cartella src/conf):

* `app_name` : nome dell'applicazione (obbligatorio per tracciatura degli eventi e check sicurezza)
* `ioitalia`: contiene le configurazioni dell'app io italia
    * `api`:
        * `url`: url del servizio io per inviare le notifiche
* `mb`: contiene la configurazione per il Message Broker.
    * `queues`: contiene le informazioni per le code del message broker
        * `events`: url della coda su cui scrivere gli eventi
        * `retry`: url della coda di retry delle notifiche che non è stato possibile inviare suhh app io
        * `messages`: url della coda su cui leggere i messaggi da inviare
    * `token`: il token auth per chiamare il message broker
* `defaulttenant`: tenant di default
* `log4js`: la configurazione di log4js (vedi https://www.npmjs.com/package/log4js)

# Running

Avviare ioconsumer 
```
cd src && node ioconsumer.js
```

oppure

```
npm start
```

# Eventi
Il sistema registra su un message broker basato su api rest gli eventi relativi all'esecuzione. Vedi la componente [notify-events](https://github.com/csipiemonte/notify-events) per i dettagli sul formato degli eventi.

## Use case

Vedere file [docs/UseCase.md](https://github.com/csipiemonte/notify-messagebroker/blob/master/docs/UseCase.md) della componente **notify-messagebroker** per dettagli su come inviare una notifica push a un utente.