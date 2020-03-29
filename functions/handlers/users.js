// DB variable from admin.js //
const {
    admin,
    db
} = require('../util/admin');

const config = require('../util/config')

const firebase = require('firebase');
firebase.initializeApp(config);

// Import of validators needed. //
const {
    validateSignUpData,
    validateLogInData,
    reduceUserDetails
} = require('../util/validators')

//-------------------------------------------// SIGN UP //-------------------------------------------//
exports.signUp = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    // Destructuring: extract valid and errors from the function imported. //
    const {
        valid,
        errors
    } = validateSignUpData(newUser);

    // If valid, go on. If not, return error 400 //
    if (!valid) return res.status(400).json(errors);

    // Assing a blank profile photo to every user. //
    const noImg = 'no-img.png'

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
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                    config.storageBucket
                  }/o/${noImg}?alt=media`,
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

//-------------------------------------------// LOGIN //-------------------------------------------//
exports.logIn = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    }

    // Destructuring: extract valid and errors from the function imported. //
    const {
        valid,
        errors
    } = validateLogInData(user);

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

//--------------------------------------// Add user details. //--------------------------------------//
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body)

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({
                messgae: 'Details added successfully'
            })
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err.code
            })
        })
}

//--------------------------------------// Get user details. //--------------------------------------//
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db
                    .collection('likes')
                    .where('userHandle', '==', req.user.handle)
                    .get();
            }
        })
        .then((data) => {
            userData.likes = [];
            data.forEach((doc) => {
                userData.likes.push(doc.data());
            });
            /*
  return db
    .collection('notifications')
    .where('recipient', '==', req.user.handle)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
})
.then((data) => {
  userData.notifications = [];
  data.forEach((doc) => {
    userData.notifications.push({
      recipient: doc.data().recipient,
      sender: doc.data().sender,
      createdAt: doc.data().createdAt,
      screamId: doc.data().screamId,
      type: doc.data().type,
      read: doc.data().read,
      notificationId: doc.id
    });
  }); */
            return res.json(userData);
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            });
        });
};

//----------------------------// uploadImage Route. For the user to upload a profile photo.  //----------------------------//
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({
        headers: req.headers
    })

    let imageToBeUploaded = {};
    let imageFileName;

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(fieldname, file, filename, encoding, mimetype);
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({
                error: 'Wrong file type submitted'
            });
        }
        // my.image.png => ['my', 'image', 'png'] //
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        // 32756238461724837.png //
        imageFileName = `${Math.round(
          Math.random() * 1000000000000
        ).toString()}.${imageExtension}`;
        // Get the file path. //
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = {
            filepath,
            mimetype
        };
        // File system (fs) library to create this file with pipe (nodejs method). //
        file.pipe(fs.createWriteStream(filepath));
    });
    // Once the file event is done, it continues to the finish event, 
    // where the file created is going to be storaged into the DB //
    busboy.on('finish', () => {
        admin
            .storage()
            .bucket(`${config.storageBucket}`)
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            // Construct the image URL to add it to our user. //
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
              config.storageBucket
            }/o/${imageFileName}?alt=media`;
                // Update user database, adding the user image. //
                return db.doc(`/users/${req.user.handle}`).update({
                    imageUrl
                });
            })
            .then(() => {
                return res.json({
                    message: 'Image uploaded successfully'
                });
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({
                    error: 'something went wrong'
                });
            });
    });
    busboy.end(req.rawBody);
};