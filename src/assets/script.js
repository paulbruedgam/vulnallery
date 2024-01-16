var requestURL = '/data/vulns.json';

function buttonClick(){
    var allButtons = document.querySelectorAll('.btn');
    var galleryCards = document.querySelectorAll('.gallery-card');
    allButtons.forEach(function(el){
        el.classList.remove('active');
    });
    this.classList.add('active')
    var year = this.textContent;
    galleryCards.forEach(function(el){
        if(el.getAttribute('data-year') == year || year == "All"){
            el.style.display = 'block';
        } else{
            el.style.display = 'none';
        }
    });
}

function genGalleryElement(el){
    // Browsersupport-Check, indem die Existenz des content Attributs
    // des template Elements geprüft wird.
    if ('content' in document.createElement('template')) {
        // Card aus dem template Element instantiieren
        var t = document.querySelector('#vuln-img');

        tcol = t.content.querySelector('.col');
        tcol.setAttribute('data-year', el['date'].substring(0,4));

        tname = t.content.querySelector('.card-title');
        tname.textContent = el['name'];

        tlink = t.content.querySelector('.btn-view');
        tlink.innerHTML = '<a href="' + el['url'] + '" class="link-light">View</a>';

        timg = t.content.querySelector('img');
        timg.src = "assets/img/" + el['image'];
        timg.alt = el['name'];

        ttext = t.content.querySelector('.publish-date');
        var date = new Date(el['date']);
        ttext.textContent = "Published: " + date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    
        // Neue Card klonen und in die Card Group einfügen
        var gallery = document.querySelector("#gallery");
        var clone = document.importNode(t.content, true);
        gallery.appendChild(clone);
    
    } else {
        // Wenn das HTML template element nicht unterstützt wird
        // muss die Tabelle auf anderem Weg erzeugt werden
    }
}

function genMenu(){
    var years = Array('All');
    var cols = document.querySelectorAll('.col');
    cols.forEach(function(el){
        var year = el.getAttribute('data-year');
        years.push(year);
    });
    years = [...new Set(years)];

    var buttons = document.querySelector('#filter-buttons');
    years.forEach(function(el){
        var btn = document.createElement("button");
        btn.type = 'button';
        btn.classList.add('btn','btn-outline-light','btn-lg')
        if(el == "All"){
            btn.classList.add('active')
        }
        btn.innerHTML = el;
        buttons.appendChild(btn);
    });
    buttons = document.querySelectorAll('.btn');
    buttons.forEach(function(el){
        el.addEventListener("click", buttonClick);
    });
}

base = window.location.origin + window.location.pathname;
var request = new XMLHttpRequest();
request.open('GET', base + requestURL);
request.responseType = 'json';
request.send();
request.onload = function() {
    var galleryElements = request.response;
    var arrayOfGalleryElements = Object.entries(galleryElements)
        .map((e) => ( {
            'name': e[1]['name'],
            'date': e[1]['date'],
            'url': e[1]['url'],
            'image': e[1]['image'],
        }))
        .sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });
    arrayOfGalleryElements.forEach(function(item){
        genGalleryElement(item);
    });
    genMenu()
}  

