const express = require('express');
const axios = require('axios');
const path = require('path');
let bodyParser = require('body-parser')
const session = require('express-session')
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
require('dotenv').config();
const jwt = require('jsonwebtoken');

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

app.use(
    session({
        secret: process.env.EXPRESS_SESSION_KEY,
        resave: false,
        saveUninitialized: true,
    })
);
app.use(passport.initialize());
app.use(passport.session());

async function createJWTTokenUsingReq(userObject) {
    try {
        let user = {
            id: userObject.id,
            email: userObject.email
        }
        const token = jwt.sign(user, process.env.JWT_AUTH_KEY, { expiresIn: '1h' }); 
        console.log('Generated JWT Token:', token);
        return token
    } catch (error) {
        console.log(error);
    }
}

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                let f_name = profile.name.givenName
                let l_name = profile.name.familyName
                let user_id = profile.id
                let profile_pic = profile.photos[0].value

                const userData = await axios.get(`${process.env.BACK_END_API_URL}/api/login/${email}`);

                if (userData && userData.data && userData.data.data.length === 0) {
                    // Insert new user if not exists
                    let response = await axios.post(`${process.env.BACK_END_API_URL}/api/login/create`, {
                        "user_id": user_id,
                        "email": email,
                        "user_profile": profile_pic
                    });
                    const userData = await axios.get(`${process.env.BACK_END_API_URL}/api/login/${email}`);
                    if (userData && userData.data && userData.data.data.length > 0) {
                        let userId = userData.data.data[0].id
                        try {
                            await axios.post(`${process.env.BACK_END_API_URL}/api/users/create`, {
                                "f_name": f_name,
                                "l_name": l_name,
                                "login_id": userId
                            });
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
                done(null, { email });
            } catch (err) {
                done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
    try {
        const userData = await axios.get(`${process.env.BACK_END_API_URL}/api/login/${email}`);
        if (userData && userData.data && userData.data.data.length > 0) {
            done(null, userData.data.data[0]);
        } else {
            done(null, false);
        }
    } catch (err) {
        done(err, null);
    }
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

async function getUserData(req) {
    try {
        const userDataResponse = await axios.get(`${process.env.BACK_END_API_URL}/api/users/${req.user.user_id}`);
        if (userDataResponse && userDataResponse.data && userDataResponse.data.data.length > 0) {
            return userDataResponse.data.data[0]
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send('An error occurred while fetching data.');
    }
}

// Route to render the home page
app.get('/', isAuthenticated, async (req, res) => {
    try {
        let data = {}
        data['userData'] = await getUserData(req)
        const response1 = await axios.get(`${process.env.BACK_END_API_URL}/api/departments/`);
        if (response1 && response1.data && response1.data.data.length > 0) {
            data['totalDepartment'] = response1.data.data.length
        }

        const response = await axios.get(`${process.env.BACK_END_API_URL}/api/users/all`);
        if (response && response.data && response.data.data.length > 0) {
            data['totalUsers'] = response.data.data.length
        }
        res.render('index', { data: data });
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send('An error occurred while fetching data.');
    }
});


app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
}));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/login', async (req, res) => {
    res.render('login', {});
});


app.get('/tables', isAuthenticated, async (req, res) => {

    let responseData = {}
    responseData['userData'] = await getUserData(req)
    const response = await axios.get(`${process.env.BACK_END_API_URL}/api/users/all`);
    if (response && response.data && response.data.data.length > 0) {
        responseData['tableData'] = response.data.data
    }
    res.render('tables', { data: responseData });

});



app.post('/createuser', isAuthenticated, async (req, res) => {
    try {
        let requestData = req.body
        const response = await axios.post(`${process.env.BACK_END_API_URL}/api/users/create`, {
            "f_name": requestData.FirstName,
            "l_name": requestData.LastName,
            "user_id": requestData.UserId,
            "email": requestData.email,
            "dept_id": requestData.dept,
            "password": requestData.Password
        });
        let pageData = []
        if (response && response.data && response.data) {
            console.log(response.data.message);
            let createdUserData
            const userData = await axios.get(`${process.env.BACK_END_API_URL}/api/users/${requestData.UserId}`);
            if (userData && userData.data && userData.data.data.length > 0) {
                createdUserData = userData.data.data[0]
            }
            res.render('index', { data: createdUserData });
        }
    } catch (error) {
        res.render('index', { error: error.message }); // 
    }

});

app.get('/register', isAuthenticated, async (req, res) => {
    const response = await axios.get(`${process.env.BACK_END_API_URL}/api/departments/`);
    let pageData = []
    if (response && response.data && response.data.data.length > 0) {
        pageData = response.data.data
    }
    res.render('register', { data: pageData });

});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

app.get('*', async function (req, res) {
    let responseData = {}
    responseData['userData'] = await getUserData(req)
    res.render('404', { data: responseData });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
