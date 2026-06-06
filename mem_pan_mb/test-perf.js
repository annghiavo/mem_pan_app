const start = Date.now();
fetch('http://localhost:8000/v1/decks/public/top')
  .then(res => res.json())
  .then(data => {
    console.log('Public top fetch time:', Date.now() - start, 'ms');
  })
  .catch(console.error);
