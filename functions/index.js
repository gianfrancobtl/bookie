// Comes together with the firebase initialization. //
const functions = require('firebase-functions');

// Initialization of Express.js //
const app = require('express')();

// Get the functions initialized in sreams, users, FBAuth // 
const FBAuth = require('./util/FBAuth')
const { getAllScreams, postScream } = require('./handlers/screams')
const { signUp, logIn, uploadImage } = require('./handlers/users')

// App is the container of all the routes of the app. //
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postScream);
app.post('/signup', signUp);
app.post('/login', logIn);
app.post('/user/profileImage', FBAuth, uploadImage)

exports.api = functions.https.onRequest(app);