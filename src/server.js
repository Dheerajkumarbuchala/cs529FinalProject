const express = require('express');
const path = require('path');
//const processData = require('./processDataV2');
const processDataV2 = require('./processDataV2');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use('/public',express.static(path.join(__dirname, '..', 'public')));

// Define a route for the root URL
app.get('/', (req, res) => {
  //processData()
  processDataV2()
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});