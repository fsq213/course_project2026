let tabs = [];
let dijkstra = null;
let ford_bellman = null;    // будет инициализирован после загрузки карт
let evklid = null;
let kun = null;
let ford_folkerson = null;
let map;

function clickMenu(v) {
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i] !== v) {
            document.getElementById(tabs[i]).classList.remove('active');
            document.getElementById(tabs[i] + '_content').classList.add('hide');
        } else {
            document.getElementById(tabs[i]).classList.add('active');
            document.getElementById(tabs[i] + '_content').classList.remove('hide');
        }
    }
}

function init_evklid() {
    evklid = new Evklid('evklid_graph', 'evklid_log', 'evklid_table', 'evklid_numA', 'evklid_numB');
}


function init() {
    const b = document.getElementsByClassName("tab");
    for (let i = 0; i < b.length; i++) {
        tabs.push(b[i].id);
    }
    init_evklid();
}

ymaps.ready(initMap);

function initMap() {
    // Карта для Дейкстры
    map = new ymaps.Map("map", {
        center: [55.751244, 37.618423],
        zoom: 10,
        controls: ['zoomControl']
    });
    dijkstra = new Dijkstra(map, 'dijkstra_log', 'dijkstra_table');
    map.events.add('click', function (e) {
        if (dijkstra.mode === 'add') {
            dijkstra.addPoint(e.get('coords'));
        }
    });

    // Карта для Форда–Беллмана
    const fordMap = new ymaps.Map("ford_bellman_map", {
        center: [55.751244, 37.618423],
        zoom: 10,
        controls: ['zoomControl']
    });
    ford_bellman = new Ford_bellman(fordMap, 'ford_bellman_log', 'ford_bellman_table');
    fordMap.events.add('click', function (e) {
        if (ford_bellman.mode === 'add') {
            ford_bellman.addPoint(e.get('coords'));
        }
    });
	
	// Карта для Форда-Фалкерсона
    const fordFulkersonMap = new ymaps.Map("ford_folkerson_map", {
        center: [55.751244, 37.618423],
        zoom: 10,
        controls: ['zoomControl']
    });
    ford_folkerson = new Ford_folkerson(fordFulkersonMap, 'ford_folkerson_log', 'ford_folkerson_table');
    fordFulkersonMap.events.add('click', function (e) {
        if (ford_folkerson.mode === 'add') ford_folkerson.addPoint(e.get('coords'));
    });
	
	    // Карта для Куна
    const kunMap = new ymaps.Map("kun_map", {
        center: [55.751244, 37.618423],
        zoom: 10,
        controls: ['zoomControl']
    });
    kun = new Kun(kunMap, 'kun_log', 'kun_table');
    kunMap.events.add('click', function (e) {
        kun.addPoint(e.get('coords'));
    });
}