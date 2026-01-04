document.addEventListener('DOMContentLoaded', async () => {
    const cardListEl = document.getElementById('cardList');
    const searchInput = document.getElementById('searchInput');
    const saveButton = document.getElementById('saveButton');
    const statusEl = document.getElementById('status');

    let allCards = [];
    let savedCardIds = new Set();

    function renderCards() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredCards = allCards.filter(card => card.name.toLowerCase().includes(searchTerm));

        cardListEl.innerHTML = '';
        if (filteredCards.length === 0) {
            cardListEl.innerHTML = '<p class="no-results" style="grid-column: 1/-1; text-align: center;">No cards match your search.</p>';
            return;
        }
        filteredCards.forEach(card => {
            const isSelected = savedCardIds.has(card.id);
            const cardItem = document.createElement('div');
            cardItem.className = `card-item ${isSelected ? 'selected' : ''}`;
            cardItem.dataset.id = card.id;

            // Add color dot if present
            let colorDot = '';
            if (card.color) {
                colorDot = `<div class="card-color-dot" style="background-color: ${card.color};"></div>`;
            }

            cardItem.innerHTML = `
                ${colorDot}
                <span>${card.name}</span>
            `;

            cardItem.addEventListener('click', () => toggleCard(card.id));
            cardListEl.appendChild(cardItem);
        });
    }

    function toggleCard(cardId) {
        if (savedCardIds.has(cardId)) {
            savedCardIds.delete(cardId);
        } else {
            savedCardIds.add(cardId);
        }
        // Re-render only class to avoid full reload
        const cardItem = document.querySelector(`.card-item[data-id="${cardId}"]`);
        if (cardItem) {
            cardItem.classList.toggle('selected');
        }
    }

    searchInput.addEventListener('input', renderCards);

    saveButton.addEventListener('click', () => {
        const btnText = saveButton.textContent;
        saveButton.textContent = 'Saving...';
        chrome.storage.sync.set({ userCards: Array.from(savedCardIds) }, () => {
            statusEl.textContent = 'Cards saved successfully!';
            saveButton.textContent = 'Saved';
            setTimeout(() => {
                statusEl.textContent = '';
                saveButton.textContent = btnText;
            }, 2000);
        });
    });

    try {
        const response = await fetch('/data/cards.json');
        allCards = await response.json();
        const { userCards } = await chrome.storage.sync.get({ userCards: [] });
        savedCardIds = new Set(userCards);
        renderCards();
    } catch (error) {
        console.error('Failed to load card data:', error);
        cardListEl.textContent = 'Error loading card list.';
    }
});
