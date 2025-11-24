    // Enregistrement du Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(function(error) {
                console.log('Service Worker registration failed:', error);
            });
    }

    let allbeer = [];
    let currentPage = 1;
    let perPage = 10;
    let searchTerm = '';
    let filteredBeers = [];
    let db = null;
    
    const request = indexedDB.open('beerDB', 2);
    request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('beers')) {
            const store = db.createObjectStore('beers', { keyPath: 'id' });
            store.createIndex('name', 'name', { unique: false });
        }
    }

    request.onsuccess = event => {
        db = event.target.result;
        // Charger les données seulement après que la base soit prête
        loadInitialData();
    }
    
    request.onerror = event => {
        console.error('Erreur IndexedDB :', event.target.errorCode);
        // Charger quand même les données même si IndexedDB échoue
        loadInitialData();
    }

    function loadInitialData() {
        fetch('https://punkapi.online/v3/beers?page=1&per_page=10')
            .then(response => response.json())
            .then(data => {
                allbeer = data;
                filteredBeers = data;
                renderBeers(filteredBeers);
                updatePaginationUI();
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des données :', error);
                const beerList = document.getElementById('beer-list');
                beerList.innerHTML = `<div style="color:red">Erreur : ${error.message}</div>`;
            });
    }

    function filterBeers(beerArray, searchText) {
        if (!searchText || searchText.trim() === '') {
            return beerArray;
        }
        const term = searchText.toLowerCase();
        return beerArray.filter(beer => {
            const name = (beer.name || '').toLowerCase();
            const desc = (beer.description || '').toLowerCase();
            const tagline = (beer.tagline || '').toLowerCase();
            return name.includes(term) || desc.includes(term) || tagline.includes(term);
        });
    }



    function renderBeers(data) {
        const beerList = document.getElementById('beer-list');
        beerList.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            beerList.innerHTML = '<div style="text-align:center;color:white;padding:40px;">Aucune bière trouvée.</div>';
            return;
        }

        data.forEach(beer => {
            const div = document.createElement('div');
            div.className = 'beer-card';

            const nameEl = document.createElement('h3');
            nameEl.textContent = beer.name || 'Nom inconnu';

            const descEl = document.createElement('p');
            descEl.className = 'description';
            descEl.textContent = beer.description || '';

            const img = document.createElement('img');
            img.src = "https://punkapi.online/v3/images/" + beer.image ;
            img.alt = beer.name || 'bière';
            img.style.maxWidth = '100px';
            img.style.margin = '5px';
            img.onerror = function() { 
                console.log('Erreur de chargement image pour:', beer.name, '- URL:', this.src);
                this.style.display = 'none'; 
            };
            
            if (db) {
                try {
                    const transaction = db.transaction('beers', 'readwrite');
                    const objectStore = transaction.objectStore('beers');
                    objectStore.put(beer); 
                } catch (e) {
                    console.error('Erreur lors de l\'ajout à IndexedDB:', e);
                }
            }
            
            div.appendChild(img);
            div.appendChild(nameEl);
            div.appendChild(descEl);

            beerList.appendChild(div);
        });
    }

    function updatePaginationUI() {
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('prev-btn').disabled = currentPage <= 1;
        document.getElementById('next-btn').disabled = false; // on ne connaît pas le total exact
    }

    function loadPage(page) {
        const beerList = document.getElementById('beer-list');
        beerList.innerHTML = '<div style="text-align:center;color:white;padding:40px;">Chargement...</div>';
        // Construire l'URL en respectant la même base que l'appel initial
        const url = `https://punkapi.online/v3/beers/?page=${page}&per_page=${perPage}`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                currentPage = page;
                allbeer = data;
                filteredBeers = filterBeers(data, searchTerm);
                renderBeers(filteredBeers);
                updatePaginationUI();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch(err => {
                console.error('Erreur:', err);
                beerList.innerHTML = `<div style="color:red">Erreur : ${escapeHtml(err.message)}</div>`;
            });
    }

    // Événements des boutons
    document.getElementById('prev-btn').addEventListener('click', () => { if (currentPage>1) loadPage(currentPage-1); });
    document.getElementById('next-btn').addEventListener('click', () => { loadPage(currentPage+1); });

    document.getElementById('per-page-select').addEventListener('change', (e) => {
        perPage = parseInt(e.target.value, 10) || 10;
        currentPage = 1;
        loadPage(currentPage);
    });

    // Recherche en temps réel
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        filteredBeers = filterBeers(allbeer, searchTerm);
        renderBeers(filteredBeers);
        
        // Afficher un message si aucun résultat
        if (filteredBeers.length === 0 && searchTerm.trim() !== '') {
            const beerList = document.getElementById('beer-list');
            beerList.innerHTML = '<div style="text-align:center;color:white;padding:40px;">Aucune bière ne correspond à votre recherche.</div>';
        }
    });

    // Bouton pour effacer la recherche
    document.getElementById('clear-search').addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        filteredBeers = allbeer;
        renderBeers(filteredBeers);
    });
