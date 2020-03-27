// THIS FILE CONTAINS ALL THE VALIDATIONS. //
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

// Validate the data of the sign up. Receives the parameter data = newUser and checks if it's all right. //
exports.validateSignUpData = (data) => {
    // Error object to be completed by all posible errors in validation process. //
    let errors = {};

    // Email validation: mustn't be empty a must be valid. //
    if (isEmpty(data.email)) {
        errors.email = 'Must not be empty.'
    } else if (!isEmail(data.email)) {
        errors.email = 'Email must be valid.'
    }

    // Password, confirmPassword and handle validation. //
    if (isEmpty(data.password)) errors.password = 'Must not be empty.'
    if (data.password != data.confirmPassword) errors.confirmPassword = 'Passwords must match.'
    if (isEmpty(data.handle)) errors.handle = 'Must not be empty.'

    // Return the errors or a boolean that says it's valid. //
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

// Validate the data of the log in. Receives the parameter data = user and checks if it's all right. //
exports.validatesLogInData = (data) => {

    let errors = {};

    if (isEmpty(data.email)) errors.email = 'Must not be empty.';
    if (isEmpty(data.password)) errors.password = 'Must not be empty.';

    // Return the errors or a boolean that says it's valid. //
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}