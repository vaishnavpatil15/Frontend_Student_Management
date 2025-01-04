const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 8000;

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to render the home page
app.get('/', async (req, res) => {
    try {
        // Make a request to an external API
        // const response = await axios.get('http://localhost:3000/api/departments/');
        let response = {data: {
            data:[]
        }}

        // Pass the data to the EJS template
        res.render('index', { data: response.data.data });
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send('An error occurred while fetching data.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
