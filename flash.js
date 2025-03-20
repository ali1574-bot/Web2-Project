// ** Ali Awadallah 60301637 ** 
// ** Diya Rafat 60301627 ** 


const persistence = require('./persistence.js');

/**
 * Retrieves the flash message from the session data.
 * 
 * @param {string} session - The session identifier.
 * @returns {string|undefined} The flash message if it exists, or undefined if not.
 */
async function getFlash(session) {
    let sd = await persistence.fetchSessionData(session);
    
    if (!sd) {
        return undefined;
    }
    let result = sd.flash;
    delete sd.flash; // Remove the flash message after fetching it
    await persistence.updateSessionData(session, sd); // Update session data to remove the flash message
    return result;
}

/**
 * Sets a flash message in the session data.
 * 
 * @param {string} session - The session identifier.
 * @param {string} message - The flash message to set.
 * @returns {undefined}
 */
async function setFlash(session, message) {
    let sd = await persistence.fetchSessionData(session);
    if (!sd) {
        return undefined;
    }
    sd.flash = message;
    await persistence.updateSessionData(session, sd); // Update the session data with the new flash message
}

module.exports = {
    setFlash, 
    getFlash
};
