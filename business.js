// ** Ali Awadallah 60301637 ** 
// ** Diya Rafat 60301627 ** 

const persistence = require("./persistence.js");
const crypto = require("crypto");
const nodemailer = require('nodemailer');

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    host: "127.0.0.1",
    port: 25
});


/**
 * Counts the total number of users in the system.
 * @returns {Promise<number>} The total number of users.
*/
async function countTotalUsers() {
  return await persistence.countTotalUsers();
}

/**
 * Generates the next available user ID for a new account.
 * 
 * @returns {Promise<string>} The next available user ID as a string.
*/
async function generateNextUserId() {
  let userCount = await countTotalUsers();
  let nextUserId = (userCount + 1 + 60000).toString();
  return nextUserId;
}

/**
 * Retrieves a list of all user details.
 * 
 * @returns {Promise<Array>} An array of user details.
 */
async function fetchAllUsers() {
  let records = await persistence.fetchAllUsers();
  return records;
}

/**
 * Registers a new user by hashing their password and saving their data.
 * 
 * @param {Object} data - The user data.
 * @returns {Promise<void>} Resolves when the user is registered.
 */
async function registerNewUser(data) {
  let hash = crypto.createHash('sha256');
  hash.update(data.password);
  let hashedPassword = hash.digest('hex');
  data.password = hashedPassword;
  data.isVerified = false; // Marks if the user has verified their account
  await persistence.addNewUser(data);
}

/**
 * Validates the login credentials and returns the user type if valid.
 * 
 * @param {string} username - The username of the user.
 * @param {string} password - The password provided by the user.
 * @returns {Promise<string|undefined>} The user type if valid, or undefined if invalid.
*/
async function validateLoginCredentials(username, password) {
  let userDetails = await persistence.fetchUserDetails(username);
  if (!userDetails) {
    return undefined; // User not found
  }

  // Verify if the user's email has been confirmed
  if (!userDetails.isVerified) {
    return "unverified"; // The user has not verified their email
  }

  let storedPassword = userDetails.password;
  let hash = crypto.createHash('sha256');
  hash.update(password);
  let hashedPassword = hash.digest('hex');

  if (userDetails == undefined || storedPassword != hashedPassword) {
    return undefined; // Invalid login credentials
  }

  return userDetails.userType; // Return the user type if credentials are correct
}

/**
 * Creates a new user session with a unique session ID.
 * 
 * @param {Object} data - The user data to store in the session.
 * @returns {Promise<Object>} The session data including the session key and expiry.
*/
async function createNewSession(data) {
  let sessionId = crypto.randomUUID();
  let sessionData = {
    sessionKey: sessionId,
    expiry: new Date(Date.now() + 1000 * 60 * 20), // Session expiry set to 20 minutes
    data: data
  };
  await persistence.saveSessionData(sessionData.sessionKey, sessionData.expiry, sessionData.data);
  return sessionData;
}

/**
 * Fetches session data based on the session key.
 * 
 * @param {string} key - The session key to fetch.
 * @returns {Promise<Object>} The session data.
 */
async function fetchSessionData(key) {
  return await persistence.fetchSessionData(key);
}

/**
 * Removes session data using the session key.
 * 
 * @param {string} key - The session key to delete.
 * @returns {Promise<void>} Resolves when the session is deleted.
*/
async function removeSession(key) {
  return await persistence.deleteSessionData(key);
}

/**
 * Retrieves the user ID by the username.
 * 
 * @param {string} username - The username to look up.
 * @returns {Promise<string>} The user ID.
 */
async function retrieveUserIdByUsername(username) {
  let user = await persistence.fetchUserDetails(username);
  return user.userId;
}

/**
 * Verifies the current password during profile page access.
 * 
 * @param {string} username - The username of the user.
 * @param {string} password - The current password provided by the user.
 * @returns {Promise<boolean>} True if the password matches, false otherwise.
 */
async function verifyCurrentPassword(username, password) {
  let hash = crypto.createHash('sha256');
  hash.update(password);
  let hashedPassword = hash.digest('hex');
  let userDetails = await persistence.fetchUserDetails(username);
  if (userDetails.password == hashedPassword) {
    return true;
  }
  return false;
}

/**
 * Updates the user's password by hashing the new one.
 * 
 * @param {string} username - The username of the user.
 * @param {string} newPassword - The new password to set.
 * @returns {Promise<void>} Resolves when the password is updated.
 */
async function updateUserPasswordByUsername(username, newPassword) {
  let hash = crypto.createHash('sha256');
  hash.update(newPassword);
  let hashedPassword = hash.digest('hex');
  await persistence.updateUserPassword(username, hashedPassword);
}

/**
 * Updates the user's password with a hashed value during the password reset process.
 * 
 * @param {string} email - The email of the user.
 * @param {string} password - The new password to set.
 * @returns {Promise<void>} Resolves when the password is updated.
*/
async function updateUserPassword(email, password) {
  let hash = crypto.createHash('sha256');
  hash.update(password);
  let hashedPassword = hash.digest('hex');
  let userDetails = await persistence.fetchEmailDetails(email);
  userDetails.password = hashedPassword;
  await persistence.updateUserRecord(userDetails);
}

/**
 * Removes the token once the password reset process is complete.
 * 
 * @param {string} token - The token to remove.
 * @returns {Promise<void>} Resolves when the token is removed.
 */
async function removeToken(token) {
  let result = await persistence.fetchToken(token);
  delete result.token;
  await persistence.updateUserRecord(result);
}

/**
 * Updates the username in session data.
 * 
 * @param {string} username - The current username.
 * @param {string} newUsername - The new username to set.
 * @returns {Promise<void>} Resolves when the session data is updated.
*/
async function updateSessionUsername(username, newUsername) {
  return await persistence.updateSessionUsername(username, newUsername);
}

/**
 * Updates the username on the profile page.
 * 
 * @param {string} oldUsername - The old username.
 * @param {string} newUsername - The new username.
 * @returns {Promise<void>} Resolves when the username is updated.
*/
async function updateUserUsername(oldUsername, newUsername) {
  await persistence.updateUsername(oldUsername, newUsername);
  await updateSessionUsername(oldUsername, newUsername);
}

/**
 * Updates the phone number of a user on their profile.
 * 
 * @param {string} newPhone - The new phone number.
 * @param {string} username - The username of the user.
 * @returns {Promise<void>} Resolves when the phone number is updated.
 */
async function updateUserPhone(newPhone, username) {
  await persistence.updatePhoneNumber(newPhone, username);
}

/**
 * Updates the email address of a user on their profile.
 * 
 * @param {string} newEmail - The new email address.
 * @param {string} username - The username of the user.
 * @returns {Promise<void>} Resolves when the email address is updated.
*/
async function updateUserEmail(newEmail, username) {
  await persistence.updateEmailAddress(newEmail, username);
}

/**
 * Fetches both email and phone details of a user by their username.
 * 
 * @param {string} username - The username to look up.
 * @returns {Promise<Array>} An array containing the email and phone number of the user.
*/
async function fetchUserContactDetails(username) {
  let userData = await persistence.fetchUserDetails(username);
  return [userData.email, userData.phone];
}

/**
 * Fetches all student user records.
 * 
 * @returns {Promise<Array>} An array of student user records.
*/
async function fetchAllStudentUsers() {
  let studentUsers = await persistence.fetchAllStudentUsers();
  for (let user of studentUsers) {
    delete user.password;
    if (user.registeredDate) {
      user.registeredDate = user.registeredDate.toLocaleDateString();
    } else {
      user.registeredDate = 'Date not available';
    }
    user.username = user.username.toUpperCase();
  }
  return studentUsers;
}

/**
 * Fetches all manager user records.
 * 
 * @returns {Promise<Array>} An array of manager user records.
 */
async function fetchAllManagerUsers() {
  let managerUsers = await persistence.fetchAllManagerUsers();
  for (let user of managerUsers) {
    delete user.password;
    if (user.registeredDate) {
      user.registeredDate = user.registeredDate.toLocaleDateString();
    } else {
      user.registeredDate = 'Date not available';
    }
    user.username = user.username.toUpperCase();
  }
  return managerUsers;
}

/**
 * Verifies if the user's ID matches the provided one.
 * 
 * @param {string} username - The username of the user.
 * @param {string} id - The ID to verify.
 * @returns {Promise<boolean>} True if the ID matches, false otherwise.
*/
async function validateUserById(username, id) {
  let userDetails = await persistence.fetchUserDetails(username);
  if (userDetails.studentID == id) {
    return true;
  }
  return false;
}

/**
 * Verifies the existence of an email and generates a password reset token.
 * 
 * @param {string} email - The email address to verify.
 * @returns {Promise<string|undefined>} The reset token if the email exists, undefined if not.
 */
async function verifyEmailAndGenerateToken(email) {
  const emailDetails = await persistence.fetchEmailDetails(email);
  if (!emailDetails) return;
  
  if (emailDetails.token && emailDetails.tokenTimestamp > Date.now() - 300000) {
    return emailDetails.token; // Return existing token
  }

  const token = await generatePasswordResetToken(email);
  return token;
}

/**
 * Generates a unique token for password reset.
 * 
 * @param {string} email - The email address to generate a reset token for.
 * @returns {Promise<number>} The generated reset token.
 */
async function generatePasswordResetToken(email) {
  let randomToken = Math.floor(Math.random() * 1000000);
  let emailDetails = await persistence.fetchEmailDetails(email);
  emailDetails.token = randomToken;
  
  await persistence.updateUserRecord(emailDetails);
  return randomToken;
}

/**
 * Fetches token details from the user records.
 * 
 * @param {string} token - The token to look up.
 * @returns {Promise<Object>} The token details.
*/
async function fetchTokenDetails(token) {
  let result = await persistence.fetchToken(token);
  return result;
}
async function sendEmail(to, subject, body) {
    console.log(`Email Details:\nTo: ${to}\nSubject: ${subject}\nBody: ${body}`);
    return { accepted: [to] }; // Simulate success
}

/**
 * Sends a password reset email to the user with a reset link.
 * @param {string} to - The email address to send the reset email to.
 * @param {string} key - The reset token.
 * @returns {Promise<number>} Resolves when the email is simulated, returns 0 if failed.
*/
async function sendPasswordResetEmail(to, key) {
  let resetLink = `http://127.0.0.1:8000/reset-password?resetKey=${key}`;
  let body = `Click the following link to reset your password: ${resetLink}`;
  try {
      await sendEmail(to, "Reset Password Link", body);
      return 1;
  } catch {
      return 0;
  }
}

async function sendEmailVerificationLink(to, key) {
  let body = `http://127.0.0.1:8000/verify-email?token=${key}`;
  try {
      await sendEmail(to, "Email Verification Link", body);
      return 1;
  } catch {
      return 0;
  }
}

/**
 * Updates the verification status of a user.
 * 
 * @param {Object} userDetails - The user details to update.
 * @returns {Promise<void>} Resolves when the user verification status is updated.
 */
async function updateUserVerificationStatus(userDetails) {
  await persistence.updateUserRecord(userDetails);
}

/**
 * Fetches all student users who have pending requests.
 * 
 * @returns {Promise<Array>} A list of student users with pending requests.
 */
async function fetchStudentRequests() {
  let requests = await persistence.fetchStudentRequests();
  for (let user of requests) {
    delete user.password;
    if (user.registeredDate) {
      user.registeredDate = user.registeredDate.toLocaleDateString();
    } else {
      user.registeredDate = 'Date not available';
    }
    user.username = user.username.toUpperCase();
  }
  return requests;
}

/**
 * Fetches student requests by student ID.
 * 
 * @param {string} studentId - The ID of the student.
 * @returns {Promise<Array>} A list of student requests for the given student ID.
 */
async function fetchStudentRequests(studentId) {
  let requests = await persistence.fetchStudentRequests(studentId);
  return requests;
}

/**
 * Fetches student requests by student ID and semester.
 * 
 * @param {string} studentId - The ID of the student.
 * @param {string} semester - The semester to filter requests.
 * @returns {Promise<Array>} A list of student requests for the given student ID and semester.
 */
async function fetchStudentRequestsBySemester(studentId, semester) {
  if (semester === "all") {
    return await persistence.fetchStudentRequests(studentId);
  } else {
    return await persistence.fetchStudentRequestsBySemester(studentId, semester);
  }
}

/**
 * Cancels a student request by updating its status to "Canceled."
 * @param {string} requestId - The ID of the request to cancel.
 * @returns {Promise<void>}
 */
async function cancelStudentRequest(requestId) {
  await persistence.updateRequestStatus(requestId, "Canceled");
  let requestDetails = await persistence.fetchRequestById(requestId);
  let message = `Your request for "${requestDetails.type}" has been canceled.`;
  await persistence.saveNotification(requestDetails.studentId, message);
  let studentDetails = await persistence.fetchUserDetails(requestDetails.studentId);
  try {
      await sendEmail(studentDetails.email, "Request Status Update", message);
  } catch (error) {
      console.error("Error sending email:", error);
  }
}

/**
 * Adds a new student request to the database.
 * @param {Object} request - The request details.
 * @returns {Promise<void>}
 */
async function addStudentRequest(request) {
  await persistence.addRequest(request);
  let message = `Your request for "${request.type}" has been submitted successfully.`;
  await persistence.saveNotification(request.studentId, message);
  let studentDetails = await persistence.fetchUserDetails(request.studentId);
  try {
      await sendEmail(studentDetails.email, "Request Status Update", 
          `Your request for "${request.type}" has been submitted successfully.\nDescription: ${request.description}`);
  } catch (error) {
      console.error("Error sending email:", error);
  }
}

/**
 * Calculates the estimated completion time for a request based on the queue length.
 * 
 * @param {string} type - The type of the request.
 * @returns {Promise<Date>} The estimated completion time.
 */
async function calculateEstimatedCompletion(type) {
  try {
    let queueLength = await persistence.getQueueLength(type);

    // Define processing times for each request type
    const processingTimes = {
      "Transcript": 15, // 15 minutes per request
      "Enrollment Letter": 20, // 20 minutes per request
      "Grade Appeal": 30 // 30 minutes per request
    };

    // Get the processing time for the given type, default to 15 minutes if not found
    let processingTimePerRequest = processingTimes[type] || 15;

    let totalProcessingTime = queueLength * processingTimePerRequest; // Total processing time in minutes

    let estimatedCompletion = new Date(); // Start from the current time

    // Define working hours
    const WORK_START_HOUR = 9; // 9:00 AM
    const WORK_END_HOUR = 17; // 5:00 PM

    while (totalProcessingTime > 0) {
      // Check if the current time is within working hours
      if (
        estimatedCompletion.getHours() >= WORK_START_HOUR &&
        estimatedCompletion.getHours() < WORK_END_HOUR &&
        estimatedCompletion.getDay() !== 0 && // Skip Sunday
        estimatedCompletion.getDay() !== 6 // Skip Saturday
      ) {
        // Deduct processing time from the total
        totalProcessingTime -= 1; // Deduct 1 minute
      }

      // Increment the time by 1 minute
      estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + 1);
    }

    return estimatedCompletion;
  } catch (error) {
    console.error("Error calculating estimated completion:", error);
    throw error;
  }
}

/**
 * Fetches queue details for all request types.
 * 
 * @returns {Promise<Array>} An array of queue details including type, queue length, and estimated completion.
 */
async function fetchQueueDetails() {
  const requestTypes = ["Transcript", "Enrollment Letter", "Grade Appeal"];
  let queueDetails = [];

  for (let type of requestTypes) {
    let queueLength = await persistence.getQueueLength(type);
    let estimatedCompletion = await calculateEstimatedCompletion(type);
    queueDetails.push({
      type: type,
      queueLength: queueLength,
      estimatedCompletion: estimatedCompletion.toLocaleString()
    });
  }

  return queueDetails;
}

/**
 * Updates the status of a request and notifies the student.
 * @param {string} requestId - The ID of the request to update.
 * @param {string} status - The new status to set.
 * @param {string} note - The note added by the admin.
 * @returns {Promise<void>}
 */
async function updateRequestStatus(requestId, status, note) {
  await persistence.updateRequestStatusAndNote(requestId, status, note);
  let requestDetails = await persistence.fetchRequestById(requestId);
  let studentDetails = await persistence.fetchUserDetails(requestDetails.studentId);
  let message = `Your request for "${requestDetails.type}" has been ${status.toLowerCase()}.\nNote: ${note}`;
  await persistence.saveNotification(requestDetails.studentId, message);
  try {
      await sendEmail(studentDetails.email, "Request Status Update", message);
  } catch (error) {
      console.error("Error sending notification:", error);
  }
}

/**
 * Sends a notification email to the user.
 * @param {string} email - The email address to send the notification to.
 * @param {Object} message - The message object containing type, status, and note.
 * @returns {Promise<void>}
 */
async function sendNotification(email, message) {
  let subject = "Request Status Update";
  let body = `Your request for "${message.type}" has been ${message.status.toLowerCase()}.\nNote: ${message.note}`;
  try {
      await sendEmail(email, subject, body);
  } catch (error) {
      console.error("Error sending notification:", error);
  }
}



/**
 * Processes a request by updating its status to "Processed" and notifying the student.
 * 
 * @param {string} requestId - The ID of the request to process.
 * @returns {Promise<void>}
 */
async function processRequest(requestId) {

  // Update the request status in the database
  await persistence.updateRequestStatus(requestId, "Processed");

  // Fetch the request details to get the student ID
  let requestDetails = await persistence.fetchRequestById(requestId);

  // Save a notification for the student
  let message = `Your request for "${requestDetails.type}" has been processed.`;
  await persistence.saveNotification(requestDetails.studentId, message);
}

/**
 * Fetches notifications for a specific student.
 * 
 * @param {string} studentId - The ID of the student whose notifications are to be fetched.
 * @returns {Promise<Array>} An array of notification objects.
 */
async function fetchNotifications(studentId) {
  return await persistence.fetchNotifications(studentId);
}

/**
 * Deletes all notifications for a specific student.
 * 
 * @param {string} studentId - The ID of the student whose notifications are to be deleted.
 * @returns {Promise<void>}
 */
async function deleteAllNotifications(studentId) {
  await persistence.deleteNotificationsByStudentId(studentId);
}

/**
 * Fetches all requests of a specific type.
 * 
 * @param {string} type - The type of the requests to fetch.
 * @returns {Promise<Array>} An array of request objects.
 */
async function fetchRequestsByType(type) {
  return await persistence.fetchRequestsByType(type);
}

/**
 * Fetches a random pending request from any queue.
 * 
 * @returns {Promise<Object>} A random request object, or null if no pending requests exist.
 */
async function fetchRandomRequest() {
  return await persistence.fetchRandomRequest();
}

/**
 * Fetches a request by its ID.
 * 
 * @param {string} requestId - The ID of the request to fetch.
 * @returns {Promise<Object>} The request object if found, or undefined if not.
 */
async function fetchRequestById(requestId) {
  return await persistence.fetchRequestById(requestId);
}

module.exports = {
  validateLoginCredentials, createNewSession, fetchSessionData, validateUserById,
  removeSession, fetchAllStudentUsers, fetchAllManagerUsers, registerNewUser,
  fetchAllUsers, fetchUserContactDetails, updateUserUsername, updateUserPhone,
  updateUserEmail, countTotalUsers, retrieveUserIdByUsername, updateUserPasswordByUsername,
  verifyCurrentPassword, updateSessionUsername, generateNextUserId, verifyEmailAndGenerateToken,
  sendPasswordResetEmail, sendEmailVerificationLink, updateUserVerificationStatus,
  fetchTokenDetails, updateUserPassword, removeToken, fetchStudentRequests,
  fetchStudentRequestsBySemester, cancelStudentRequest, addStudentRequest, calculateEstimatedCompletion,
  fetchQueueDetails, updateRequestStatus, sendNotification, processRequest, fetchNotifications,
  deleteAllNotifications, fetchRequestsByType, fetchRandomRequest, fetchRequestById, sendEmail
};