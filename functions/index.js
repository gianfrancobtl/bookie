// Comes together with the firebase initialization. //
const functions = require('firebase-functions');

// Initialization of Express.js //
const app = require('express')();

// Import of database. //
const {
    db
} = require('./util/admin');

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
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
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
app.post('/user/profileImage', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.region('us-central1').https.onRequest(app);

// Use of firebase triggers -- FUNCTIONS -- //
// Notification on likes //
exports.createNotificationOnLike = functions
    .region('us-central1')
    .firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        // Fetch of the db on the scream that comes from the snapshot (the likeDocument). //
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    // If the scream exists and the user of the scream is not the same from the snapshot, set a notification. //
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        // User who posted the scream. //
                        recipient: doc.data().userHandle,
                        // User who liked the scream. //
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        // ID of the scream. //
                        screamId: doc.id
                    });
                }
            })
            .catch((err) => console.error(err));
    });

// Delete notification on likes. //
exports.deleteNotificationOnUnLike = functions
    .region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
                return;
            });
    });

// Notifications on comments. //
exports.createNotificationOnComment = functions
    .region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    // If the scream exists and the user of the scream is not the same from the snapshot, set a notification. //
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            .catch((err) => {
                console.error(err);
                return;
            });
    });

// TRIGGER: Change the user image in each scream. //
exports.onUserImageChange = functions
    .region('us-central1')
    .firestore.document('/users/{userId}')
    // Change object: two properties: before and after. Compare them. //
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            console.log('image has changed');
            // Init of bath, used for updates. //
            const batch = db.batch();
            // Fetch all the screams that belong to the user to change all the images. //
            return db
                .collection('screams')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        // Updates the user image. //
                        batch.update(scream, {
                            userImage: change.after.data().imageUrl
                        });
                    });
                    return batch.commit();
                });
        } else return true;
    });

// If a scream is deleted, delete all the likes, comments and notifications related to it. //
exports.onScreamDelete = functions
    .region('us-central1')
    .firestore.document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
        // Context: info in the url. //
        const screamId = context.params.screamId;
        // Init of bath, used for updates. //
        const batch = db.batch();
        return db
            .collection('comments')
            .where('screamId', '==', screamId)
            .get()
            .then((data) => {
                // Once we get the comments, delete them. //
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });
                return db
                    .collection('likes')
                    .where('screamId', '==', screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    // Once we get the likes, delete them. //
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });
                return db
                    .collection('notifications')
                    .where('screamId', '==', screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    // Once we get the notifications, delete them. //
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((err) => console.error(err));
    });