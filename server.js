const express = require('express');
const axios = require('axios');
const path = require('path');
let bodyParser = require('body-parser')

const app = express();
const PORT = 8000;

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to render the home page
app.get('/', async (req, res) => {
    try {
        res.render('index', { data: {} });
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send('An error occurred while fetching data.');
    }
});

app.get('/login', async (req, res) => {
    res.render('login', {});

});



app.post('/createuser', async (req, res) => {
    let requestData =  req.body
    const response = await axios.post('http://localhost:3000/api/users/create', {  
        "f_name": requestData.FirstName,
        "l_name": requestData.LastName,
        "user_id": requestData.UserId,
        "dept_id": requestData.dept,
        "password": requestData.Password });
    let pageData = []
    if (response && response.data && response.data) {
        console.log(response.data.message);
        let createdUserData
         const userData = await axios.get(`http://localhost:3000/api/users/${requestData.UserId}`);
         if (userData && userData.data && userData.data.data.length > 0) {
            createdUserData = userData.data.data[0]
        }
        res.render('index', { data: createdUserData });
    }
   
});

app.get('/register', async (req, res) => {
    const response = await axios.get('http://localhost:3000/api/departments/');
    let pageData = []
    if (response && response.data && response.data.data.length > 0) {
        pageData = response.data.data
    }
    res.render('register', { data: pageData });

});

app.get('*', function (req, res) {
    res.render('404', {});
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
