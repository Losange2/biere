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
            db.createObjectStore('beers', { keyPath: 'id' });
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
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des données :', error);
                const beerList = document.getElementById('beer-list');
                if (beerList) {
                    beerList.innerHTML = `<div style="color:red">Erreur : ${error.message}</div>`;
                }
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
        if (!beerList) {
            return;
        }
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

    function addBeerFromInput() {
        const nameInput = document.getElementById('beer-name');
        const descInput = document.getElementById('beer-description');
        const imageInput = document.getElementById('beer-image-url');
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const imageUrl = imageInput.value.trim();
        if (!name) {
            alert('Le nom de la bière est requis.');
            return;
        }
        const newBeer = {
            id: Date.now(),
            name: name,
            description: description,
            image: imageUrl
        };
        if (db) {
            try {
                const transaction = db.transaction('beers', 'readwrite');
                const objectStore = transaction.objectStore('beers');
                const request = objectStore.add(newBeer);
                request.onsuccess = () => {
                    alert('Bière ajoutée avec succès à la base de données locale.');
                    nameInput.value = '';
                    descInput.value = '';
                    imageInput.value = '';
                }
                request.onerror = (e) => {
                    console.error('Erreur lors de l\'ajout à IndexedDB:', e);
                    alert('Erreur lors de l\'ajout de la bière.');
                }
            } catch (e) {
                console.error('Erreur lors de l\'ajout à IndexedDB:', e);
                alert('Erreur lors de l\'ajout de la bière.');
            }
        } else {
            alert('La base de données locale n\'est pas disponible.');
        }
    }
