// Comes together with the firebase initialization. //
const functions = require('firebase-functions');

// Initialization of Express.js //
const app = require('express')();

// Get the functions initialized in sreams, users, FBAuth // 
const FBAuth = require('./util/FBAuth')
const {
    getAllScreams,
    postScream,
    getScream,
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream
} = require('./handlers/screams')
const {
    signUp,
    logIn,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser
} = require('./handlers/users')

// App is the container of all the routes of the app. //
// Scream routes. //
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream)
app.post('/scream/:screamId/like', FBAuth, likeScream)
app.post('/scream/:screamId/unlike', FBAuth, unlikeScream)
app.post('/scream/:screamId/comment', FBAuth, commentOnScream)

// User routes. //
app.post('/signup', signUp);
app.post('/login', logIn);
app.post('/user/profileImage', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app);