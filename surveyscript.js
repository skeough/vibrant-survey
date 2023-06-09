const translations = {
    en: { message: "Thank you for texting the Lifeline. This conversation has ended. If you're in crisis again please call 988 or text back anytime. We'd love your feedback so we can continue to improve. If you like, you can share your thoughts.", cancel: "No", submit: "Yes" },
    es: { message: "Gracias por enviar un mensaje de texto a Lifeline. Esta conversación ha terminado. Si vuelve a tener una crisis, llame al 988 o envíe un mensaje de texto en cualquier momento. Nos encantaría recibir sus comentarios para poder seguir mejorando. Si lo desea, puede compartir sus opiniones.", cancel: "No", submit: "Sí" },
}
const apiUrl = "https://nyhvybpq5dvtad5rdpxxm25ypm0lgdif.lambda-url.us-east-1.on.aws/";
const datatableid = "73c8d2ed-2855-46c6-89ed-1c53e711409a";

let conversationEnd = sessionStorage.getItem('conversationEnd') || null;
let retry = true;

Genesys("subscribe", "LocalStorage.ready", function (data) {
    console.log(data)
});
Genesys('subscribe', 'Launcher.ready', function (o) {
    console.log('Genesys ready', o);
    //recieve disconnected event
    Genesys('subscribe', 'MessagingService.conversationDisconnected', function (data) {
        console.log('conversation disconnected', data);
        console.log(JSON.parse(conversationEnd), retry);
        if (!JSON.parse(conversationEnd) && conversationEnd !== null && retry) {
            conversationEnd = true
            sessionStorage.setItem('conversationEnd', true)
            console.log('end of conversation', data)
            setTimeout(async function () {
                await getValues();
                console.log('displayed survey modal')
            }, 3000)
        }
    })
    //recieve connected event
    Genesys('subscribe', 'Conversations.started', function (data) {
        console.log('new conversation', data);
        conversationEnd = false
        sessionStorage.setItem('conversationEnd', false)
    })
})

// get conversation id and case id
async function getValues() {
    const token = JSON.parse(localStorage.getItem('_actmu')).value;
    const data = {
        check: 'lego',
        rowid: token,
        datatableid: datatableid,
    };
    console.log(data);
    const post = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Origin': document.location.origin,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    console.log('getting results...');
    const results = await post.json();
    console.log(results);
    if (results?.key) {
        createModal(results.convId, results.caseId)
    };
    if (results?.error?.status === 404 && retry) {
        console.log('no results... retry in 5sec');
        retry = false;
        setTimeout(function () {
            getValues();
        }, 5000);
    };
};

function createModal(convId, caseId) {

    let dialog = document.createElement('dialog');
    let form = document.createElement('form');
    let p = document.createElement('p');
    let buttonGroup = document.createElement('div');
    let close = document.createElement('button');
    let accept = document.createElement('button');

    const { message, cancel, submit } = translations[getLanguage()];

    let url = `https://domo.networkresourcecenter.org/${getLanguage()}/chatvisitor/postchatsurvey/${convId}/?caseID=${caseId}`

    dialog.setAttribute('id', 'dialog');
    dialog.setAttribute('class', 'dialog');
    dialog.setAttribute('style', 'width: 40%;');
    dialog.setAttribute('aria-live', 'polite');
    dialog.addEventListener('close', function (e) {
        console.log('dialog closed', e.target.returnValue);
        if (e.target.returnValue) {
            window.open(e.target.returnValue, '_blank');
        }
        dialog.remove();
    });

    form.setAttribute('method', 'dialog');

    p.innerHTML = message;

    buttonGroup.setAttribute('class', 'button-group');
    buttonGroup.setAttribute('style', 'display: flex; justify-content: center; gap: 1rem;');


    close.setAttribute('type', 'button');
    close.setAttribute('value', 'Cancel');
    close.innerHTML = cancel;
    close.addEventListener('click', function () {
        dialog.close();
        console.log('cancel clicked');
    });

    accept.setAttribute('type', 'button');
    accept.setAttribute('value', 'Submit');
    accept.innerHTML = submit;
    accept.addEventListener('click', function (event) {
        event.preventDefault();
        dialog.close(url);
        console.log('submit clicked', url);
    });

    form.appendChild(p);
    buttonGroup.appendChild(close);
    buttonGroup.appendChild(accept);
    form.appendChild(buttonGroup);
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.showModal();
}

function getLanguage() {
    let lang;
    switch (navigator?.language) {
        case 'en':
        case 'en-us':
            lang = 'en';
            break;
        case 'es':
            lang = 'es';
            break;
        default:
            lang = 'en';
    }
    return lang;
}