fetch('http://localhost:8000/v1/decks/public/top')
  .then(res => res.json())
  .then(data => {
    if (data.decks && data.decks.length > 0) {
      const deckId = data.decks[0].deckId;
      console.log('Fetching cards for deck:', deckId);
      const start = Date.now();
      fetch('http://localhost:8000/v1/decks/' + deckId + '/cards')
        .then(res => res.json())
        .then(data => {
          console.log('Cards fetch time:', Date.now() - start, 'ms');
          console.log('Cards count:', data.cards ? data.cards.length : 0);
        });
    }
  });
