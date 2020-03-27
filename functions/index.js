const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialization of Express.js
const app = require('express')();
admin.initializeApp();

// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyBWVImZEZkSP_UyhrT7CzwnWo56kWm-4-s",
    authDomain: "bookie-d0d87.firebaseapp.com",
    databaseURL: "https://bookie-d0d87.firebaseio.com",
    projectId: "bookie-d0d87",
    storageBucket: "bookie-d0d87.appspot.com",
    messagingSenderId: "448323929481",
    appId: "1:448323929481:web:4f6d9ad2020ea08c530d58",
    measurementId: "G-SP60GL4D01"
};

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// App is the container of all the routes of the app;
app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('created', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().created
                })
            })
            return res.json(screams);
        })
        .catch((err) => console.log(err));
})

app.post('/scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        created: new Date().toISOString()
    };

    //persist it on the db
    db
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({
                message: `document ${doc.id} created succesfully`
            });
        })
        .catch((err) => {
            res.status(500).json({
                error: 'something went wrong'
            });
            console.log(err);
        });
});

let token, userId;
//Sign Up route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    //Validation of data
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) => {
            if (doc.exists) {
                //Bad request
                return res.status(400).json({
                    error: 'This handle is already taken.'
                });
            } else {
                return firebase.
                auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json ({ token })
        })
        .catch((err) => {
            console.log(err);
            if (err.code == "auth/email-already-in-use") {
                return res.status(400).json({
                    email: 'Email is already in use.'
                });
            } else {
                // Internal server error
                return res.status(500).json({
                    error: err.code
                });
            }
        });
});

exports.api = functions.https.onRequest(app);