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
                    createdAt: doc.data().created
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
            comment: 'Must not be empty'
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