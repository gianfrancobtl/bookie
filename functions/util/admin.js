// Initialization of the Firebase dependency. //
const admin = require('firebase-admin');
admin.initializeApp();

// DataBase Variable. //
const db = admin.firestore();

module.exports = { admin, db };