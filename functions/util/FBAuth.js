// Admin and DB are two variables initialized in admin. //
const { admin, db } = require ('./admin')

// Firebase Authentication. Validation of the Token. //
module.exports = (req, res, next) => {
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