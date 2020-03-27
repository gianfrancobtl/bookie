// Comes together with the firebase initialization. //
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialization of Express.js //
const app = require('express')();
admin.initializeApp();

// Your web app's Firebase configuration. //
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

// Initialization of the Firebase dependency. //
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

// DataBase Variable. //
const db = admin.firestore();

// App is the container of all the routes of the app. //
// GET: A POSTED SCREAM. //
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

// Firebase Authentication. Validation of the Token. //
const FBAuth = (req, res, next) => {
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found');
        return res.status(403).json({
            error: 'Unauthorized'
        });
    }

    admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
            req.user = decodedToken;
            // Get ONE user where the id = uid in db //
            return db
                .collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            // Validate the handle of the user. Now it can be asked from here. //
            req.user.handle = data.docs[0].data().handle;
            // Next allows the code to continue 'reading'. //
            return next();
        })
        .catch((err) => {
            console.error('Error while verifying token.', err);
            return res.status(403).json(err);
        });
}

// POST: NEW SCREAM. //
app.post('/scream', FBAuth, (req, res) => {
    // Body must not be empty. //
    if (req.body.body.trim() === '') {
        return res.status(400).json({
            body: 'Body must not be empty.'
        });
    }

    // Object. //
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        created: new Date().toISOString()
    };

    // Persist it on the DB. //
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

// Validates the email is valid. Use of Regular Expression (RegEx). //
const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
}

// Validates the field is not empty. Receives a string that could be an emial, a password or anything else. //
const isEmpty = (string) => {
    if (string.trim() === '') return true;
    else return false;
}

// SIGN UP ROUTE //
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    // Error object to be completed by all posible errors in validation process. //
    let errors = {};

    // Email validation: mustn't be empty a must be valid. //
    if (isEmpty(newUser.email)) {
        errors.email = 'Must not be empty.'
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Email must be valid.'
    }

    // Password, confirmPassword and handle validation. //
    if (isEmpty(newUser.password)) errors.password = 'Must not be empty.'
    if (newUser.password != newUser.confirmPassword) errors.confirmPassword = 'Passwords must match.'
    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty.'

    // Return error 400 if there's any error //
    if (Object.keys(errors).length > 0) return res.status(400).json(errors)

    let token, userId;
    // Validation of data. //
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) => {
            if (doc.exists) {
                // Bad request if handle is already taken. //
                return res.status(400).json({
                    error: 'This handle is already taken.'
                });
            } else {
                // Submit it into the db if it does not exist already. //
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
            return res.status(201).json({
                token
            })
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

// LOGIN ROUTE. //
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    }

    let errors = {};

    if (isEmpty(user.email)) errors.email = 'Must not be empty.';
    if (isEmpty(user.password)) errors.password = 'Must not be empty.';

    // Return error 400 if there's any error //
    if (Object.keys(errors).length > 0) return res.status(400).json(errors)

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({
                token
            });
        })
        .catch((err) => {
            console.log(err);
            if (err.code == "auth/wrong-password") {
                return res.status(400).json({
                    password: 'Wrong password. Try again.'
                });
            } else {
                // Internal server error 
                return res.status(500).json({
                    error: err.code
                });
            }
        });
})

exports.api = functions.https.onRequest(app);