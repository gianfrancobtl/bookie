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