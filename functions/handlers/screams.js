// DB variable from admin.js //
const {
    db
} = require('../util/admin')

// Export the functions so it can be used in the rest of the project. //
// GET: AN ALREADY POSTED SCREAM. //
exports.getAllScreams = (req, res) => {
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
                    createdAt: doc.data().created,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage
                })
            })
            return res.json(screams);
        })
        .catch((err) => console.log(err));
}

// POST: NEW SCREAM. //
exports.postScream = (req, res) => {
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
        userImage: req.user.imageUrl,
        created: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    console.log(newScream)
    // Persist it on the DB. //
    db
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            const resScream = newScream;
            resScream.screamId = doc.id;
            res.json(resScream);
        })
        .catch((err) => {
            res.status(500).json({
                error: 'something went wrong'
            });
            console.log(err);
        });
}

// FETCH ONE SCREAM BY ID. //
exports.getScream = (req, res) => {
    // Object that contains all the data of the scream. //
    let screamData = {};
    // Fetch the scream by ScreamID //
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            // Return error if scream doesn't exist. //
            if (!doc.exists) {
                return res.status(404).json({
                    error: 'Scream not found'
                });
            }
            // Else: Save the scream data into the object initialized before. //
            screamData = doc.data();
            // Add the ID of the scream to the data. Needed later. //
            screamData.screamId = doc.id;
            // Fetch the comments of the scream. //
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamId', '==', req.params.screamId)
                .get();
        })
        .then((data) => {
            // New variable for the comments on the Scream Data. //
            screamData.comments = [];
            // Push doc.data() (the comments) to the variable initialized. //
            data.forEach((doc) => {
                screamData.comments.push(doc.data());
            });
            // Return the scream by the ID with the comments. //
            return res.json(screamData);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({
                error: err.code
            });
        });
}

// COMMENT ON A SCREAM. //
exports.commentOnScream = (req, res) => {
    // Validate it's not empty. //
    if (req.body.body.trim() === '')
        return res.status(400).json({
            comment: 'Must not be empty.'
        });

    // Init of newComment object. //
    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        // User handle: we can identify the user by it. //
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            // Confirm that the scream exists already. //
            if (!doc.exists) {
                return res.status(404).json({
                    error: 'Scream not found'
                });
            }
            // If the scream exists, add '1' to the count of comments of it and ... //
            return doc.ref.update({
                commentCount: doc.data().commentCount + 1
            });
        })
        .then(() => {
            // ... add the comment to the db. //
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            // Log needed for user interface. //
            res.json(newComment);
        })
        // Catch any error. //
        .catch((err) => {
            console.log(err);
            res.status(500).json({
                error: 'Something went wrong'
            });
        });
}

// LIKE A SCREAM. //
exports.likeScream = (req, res) => {
    // Fetch the collection of likes where the userHandle of the post is the same of the one of the user
    // and the screamId from the params is the same from the one of the collection 'likes'.
    // LIMIT: an array with only one doc. //
    const likeDocument = db
        .collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);

    // Fetch the scream by the params. //
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    // Init of the object variable. //
    let screamData;

    // Check the screamDocument exists. 
    // If it does, 'send' the data to the variable initialized and set the screamId as the doc.id got. //
    screamDocument
        .get()
        .then((doc) => {
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                // Returns the like document, that must be empty if it wasn't liked by the user before. //
                return likeDocument.get();
            } else {
                return res.status(404).json({
                    error: 'Scream not found'
                });
            }
        })
        .then((data) => {
            // If there is no like for that userHandle and ScreamId both together, ADD one. //
            if (data.empty) {
                return db
                    .collection('likes')
                    .add({
                        screamId: req.params.screamId,
                        userHandle: req.user.handle
                    })
                    .then(() => {
                        // Increment the like count of the scream by one. //
                        screamData.likeCount++;
                        // Update the likes in the DB. //
                        return screamDocument.update({
                            likeCount: screamData.likeCount
                        });
                    })
                    .then(() => {
                        return res.json(screamData);
                    });
            } else {
                return res.status(400).json({
                    error: 'Scream already liked'
                });
            }
        })

}

// UNLIKE A SCREAM. //
exports.unlikeScream = (req, res) => {
    const likeDocument = db
        .collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument
        .get()
        .then((doc) => {
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({
                    error: 'Scream not found'
                });
            }
        })
        .then((data) => {
            if (data.empty) {
                return res.status(400).json({
                    error: 'Scream not liked'
                });
            } else {
                // If the scream has a like, delete it by the id of the like. //
                return db
                    .doc(`/likes/${data.docs[0].id}`)
                    .delete()
                    .then(() => {
                        // Decrement the likeCount variable and update it in the DB. //
                        screamData.likeCount--;
                        return screamDocument.update({
                            likeCount: screamData.likeCount
                        });
                    })
                    .then(() => {
                        res.json(screamData);
                    });
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({
                error: err.code
            });
        });
}

// DELETE SCREAM. //
exports.deleteScream = (req, res) => {
    // Save the scream to delete into a const variable //
    const document = db.doc(`/screams/${req.params.screamId}`);

    // If the scream efectevelly exists, delete it with delete method. //
    document
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: 'Scream not found'
                });
            }
            if (doc.data().userHandle !== req.user.handle) {
                return res.status(403).json({
                    error: 'Unauthorized'
                });
            } else {
                return document.delete();
            }
        })
        .then(() => {
            res.json({
                message: 'Scream deleted successfully'
            });
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            });
        });
}