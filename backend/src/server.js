import app from './app.js';

app.listen(process.env.PORT || 5000, (err) => {
  if (err) throw err;
  console.log('MedInvent running');
});