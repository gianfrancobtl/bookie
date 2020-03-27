// DB variable from admin.js //
const {
    db
} = require('../util/admin');

const config = require('../util/config')

const firebase = require ('firebase');
firebase.initializeApp(config);

// Import of validators needed. //
const { validateSignUpData, validateLogInData } = require('../util/validators')

// SIGN UP ROUTE //
exports.signUp = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    // Destructuring: extract valid and errors from the function imported. //
    const { valid, errors } = validateSignUpData (newUser);

    // If valid, go on. If not, return error 400 //
    if (!valid) return res.status(400).json(errors);

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
}

// LOGIN ROUTE. //
exports.logIn = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    }

    // Destructuring: extract valid and errors from the function imported. //
    const { valid, errors } = validateLogInData (user);

    // If valid, go on. If not, return error 400 //
    if (!valid) return res.status(400).json(errors);

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
}