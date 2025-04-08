// ** Ali Awadallah 60301637 ** 
// ** Diya Rafat 60301627 ** 

const mongodb = require('mongodb');

let client = undefined;
let db = undefined;
let users = undefined;
let session = undefined;

/**
 * Connects to the MongoDB database and initializes collections.
 * Ensures a single database connection is used throughout.
 */
async function connectToDatabase() {
  if (!client) {
    client = new mongodb.MongoClient('mongodb+srv://aliawadallah:Ali50755477@webproject.apcjn.mongodb.net/');
    db = client.db('webproject');
    users = db.collection('Accounts');
    session = db.collection('SessionData');
    await client.connect();
  }
}

/**
 * Fetches user details based on the provided username.
 * 
 * @param {string} username - The username to search for.
 * @returns {Object} The user details if found, or undefined if not.
 */
async function fetchUserDetails(username) {
  await connectToDatabase();
  let user = await users.find({ username: username });
  let userDetails = await user.toArray();
  return userDetails[0];
}

/**
 * Fetches details of a user based on the provided email address.
 * 
 * @param {string} email - The email address to search for.
 * @returns {Object} The user details if found, or undefined if not.
 */
async function fetchEmailDetails(email) {
  await connectToDatabase();
  let result = await users.findOne({ email: email });
  return result;
}

/**
 * Fetches user details based on the provided token.
 * 
 * @param {string} token - The token to search for.
 * @returns {Object} The user details if the token is found, or undefined if not.
 */
async function fetchToken(token) {
  await connectToDatabase();
  if (!token) {
    return undefined;
  }
  let result = await users.findOne({ token: token });
  return result;
}

/**
 * Updates the username of a user in the database.
 * 
 * @param {string} oldUsername - The current username.
 * @param {string} newUsername - The new username to be set.
 */
async function updateUsername(oldUsername, newUsername) {
  await connectToDatabase();
  await users.updateOne({ username: oldUsername }, { $set: { username: newUsername } });
}

/**
 * Updates the phone number of a user in the database.
 * 
 * @param {string} newPhone - The new phone number.
 * @param {string} username - The username of the user whose phone number is to be updated.
 */
async function updatePhoneNumber(newPhone, username) {
  await connectToDatabase();
  await users.updateOne({ username: username }, { $set: { phone: newPhone } });
}

/**
 * Updates the email address of a user in the database.
 * 
 * @param {string} newEmail - The new email address.
 * @param {string} username - The username of the user whose email is to be updated.
 */
async function updateEmailAddress(newEmail, username) {
  await connectToDatabase();
  await users.updateOne({ username: username }, { $set: { email: newEmail } });
}

/**
 * Updates the password of a user in the database.
 * 
 * @param {string} username - The username of the user whose password is to be updated.
 * @param {string} newPassword - The new password to set for the user.
 */
async function updateUserPassword(username, newPassword) {
  await connectToDatabase();
  await users.updateOne({ username: username }, { $set: { password: newPassword } });
}

/**
 * Updates the user record with the new data provided.
 * 
 * @param {Object} data - The updated user data.
 */
async function updateUserRecord(data) {
  await connectToDatabase();
  await users.replaceOne({ username: data.username }, data);
}

/**
 * Returns the total number of users in the database.
 * 
 * @returns {number} The total number of users.
 */
async function countTotalUsers() {
  await connectToDatabase();
  let totalUsers = await users.countDocuments();
  return totalUsers;
}

/**
 * Saves a new session data to the session collection.
 * 
 * @param {string} uuid - The session key to associate with the session.
 * @param {string} expiry - The expiration date/time of the session.
 * @param {Object} data - The session data to save.
 */
async function saveSessionData(uuid, expiry, data) {
  await connectToDatabase();
  let sessionData = {
    sessionKey: uuid,
    expiry: expiry,
    data: data
  };
  await session.insertOne(sessionData);
}

/**
 * Fetches session data based on the session key.
 * 
 * @param {string} key - The session key to search for.
 * @returns {Object} The session data if found, or undefined if not.
 */
async function fetchSessionData(key) {
  await connectToDatabase();
  let sessionData = await session.find({ sessionKey: key });
  let sessionDetails = await sessionData.toArray();
  return sessionDetails[0];
}

/**
 * Updates the session data for a given session key.
 * 
 * @param {string} ssid - The session key to update.
 * @param {Object} sd - The updated session data.
 */
async function updateSessionData(ssid, sd) {
  await connectToDatabase();
  await session.replaceOne({ sessionKey: ssid }, sd);
}

/**
 * Updates the username within session data for a given username.
 * 
 * @param {string} username - The current username.
 * @param {string} newUsername - The new username to set in the session.
 */
async function updateSessionUsername(username, newUsername) {
  await connectToDatabase();
  await session.updateMany(
    { "data.username": username },
    { $set: { "data.username": newUsername } }
  );
}

/**
 * Deletes session data for a given session key.
 * 
 * @param {string} key - The session key to delete.
 */
async function deleteSessionData(key) {
  await connectToDatabase();
  await session.deleteOne({ sessionKey: key });
}

/**
 * Fetches all student users from the database.
 * 
 * @returns {Array} A list of student users.
 */
async function fetchAllStudentUsers() {
  await connectToDatabase();
  let studentUsers = await users.find({ userType: "student" });
  studentUsers = await studentUsers.toArray();
  return studentUsers;
}


/**
 * Adds a new user to the database.
 * 
 * @param {Object} data - The user data to add.
 */
async function addNewUser(data) {
  await connectToDatabase();
  await users.insertOne(data);
}

/**
 * Fetches all users from the database.
 * 
 * @returns {Array} A list of all users.
 */
async function fetchAllUsers() {
  await connectToDatabase();
  let records = await users.find();
  let userRecords = await records.toArray();
  return userRecords;
}

/**
 * Fetches details of a user based on the provided token.
 * 
 * @param {string} token - The token to search for.
 * @returns {Object} The user details if the token is found, or undefined if not.
 */
async function fetchTokenDetails(token) {
  await connectToDatabase();
  if (!token) {
    return undefined;
  }
  let result = await users.findOne({ token: token });
  return result;
}

/**
 * Fetches all requests for a specific student from the database.
 * 
 * @param {string} studentId - The ID of the student whose requests are to be fetched.
 * @returns {Promise<Array>} An array of request objects.
 */
async function fetchStudentRequests(studentId) {
  await connectToDatabase();
  let requests = await db.collection('Requests').find({ studentId: studentId }).toArray();
  return requests;
}

/**
 * Fetches all requests for a specific student and semester from the database.
 * 
 * @param {string} studentId - The ID of the student whose requests are to be fetched.
 * @param {string} semester - The semester for which requests are to be fetched.
 * @returns {Promise<Array>} An array of request objects.
 */
async function fetchStudentRequestsBySemester(studentId, semester) {
  await connectToDatabase();
  let requests = await db.collection('Requests').find({ studentId: studentId, semester: semester }).toArray();
  return requests;
}

/**
 * Updates the status of a request in the database.
 * 
 * @param {string} requestId - The ID of the request to update.
 * @param {string} status - The new status of the request (e.g., "Canceled").
 * @returns {Promise<void>}
 */
async function updateRequestStatus(requestId, status) {
  await connectToDatabase();
  let objectId = new mongodb.ObjectId(requestId); // Convert requestId to ObjectId
  await db.collection('Requests').updateOne({ _id: objectId }, { $set: { status: status } });
}

/**
 * Updates the status and note of a request in the database.
 * 
 * @param {string} requestId - The ID of the request to update.
 * @param {string} status - The new status of the request.
 * @param {string} note - The note added by the admin.
 * @returns {Promise<void>}
 */
async function updateRequestStatusAndNote(requestId, status, note) {
  await connectToDatabase();
  let objectId = new mongodb.ObjectId(requestId); // Convert requestId to ObjectId
  await db.collection('Requests').updateOne(
    { _id: objectId },
    { $set: { status: status, note: note } }
  );
}

/**
 * Adds a new request to the database.
 * 
 * @param {Object} request - The request details.
 * @returns {Promise<void>}
 */
async function addRequest(request) {
  await connectToDatabase();
  try {
    await db.collection('Requests').insertOne(request);
  } catch (error) {
    console.error("Error inserting request into the database:", error);
    throw error;
  }
}

/**
 * Gets the length of the queue for a specific request type.
 * 
 * @param {string} type - The type of the request.
 * @returns {Promise<number>} The number of requests in the queue.
 */
async function getQueueLength(type) {
  await connectToDatabase();
  try {
    let queueLength = await db.collection('Requests').countDocuments({ type: type, status: "Pending" });
    return queueLength;
  } catch (error) {
    console.error("Error fetching queue length:", error);
    throw error;
  }
}

/**
 * Fetches a request by its ID.
 * 
 * @param {string} requestId - The ID of the request to fetch.
 * @returns {Promise<Object>} The request object if found, or undefined if not.
 */
async function fetchRequestById(requestId) {
  await connectToDatabase();
  let objectId = new mongodb.ObjectId(requestId); // Convert requestId to ObjectId
  let request = await db.collection('Requests').findOne({ _id: objectId });
  return request;
}

/**
 * Fetches all requests of a specific type from the database.
 * 
 * @param {string} type - The type of the requests to fetch.
 * @returns {Promise<Array>} An array of request objects.
 */
async function fetchRequestsByType(type) {
  await connectToDatabase();
  let requests = await db.collection('Requests').find({ type: type, status: "Pending" }).toArray();
  return requests;
}

/**
 * Fetches a random pending request from the database.
 * 
 * @returns {Promise<Object>} A random request object, or null if no pending requests exist.
 */
async function fetchRandomRequest() {
  await connectToDatabase();
  let requests = await db.collection('Requests').aggregate([
    { $match: { status: "Pending" } },
    { $sample: { size: 1 } } // Randomly select one document
  ]).toArray();
  return requests[0] || null;
}

/**
 * Saves a notification for a specific student.
 * 
 * @param {string} studentId - The ID of the student to whom the notification is addressed.
 * @param {string} message - The notification message.
 */
async function saveNotification(studentId, message) {
  await connectToDatabase();
  let notification = {
    studentId: studentId,
    message: message,
    createdAt: new Date()
  };
  await db.collection('Notifications').insertOne(notification);
}

/**
 * Fetches notifications for a specific student.
 * 
 * @param {string} studentId - The ID of the student whose notifications are to be fetched.
 * @returns {Promise<Array>} An array of notification objects.
 */
async function fetchNotifications(studentId) {
  await connectToDatabase();
  let notifications = await db.collection('Notifications').find({ studentId: studentId }).toArray();
  return notifications;
}

/**
 * Deletes all notifications for a specific student from the database.
 * 
 * @param {string} studentId - The ID of the student whose notifications are to be deleted.
 * @returns {Promise<void>}
 */
async function deleteNotificationsByStudentId(studentId) {
  await connectToDatabase();
  await db.collection('Notifications').deleteMany({ studentId: studentId });
}

module.exports = {
  fetchUserDetails, saveSessionData, fetchSessionData, updateSessionData, deleteSessionData,
  fetchAllStudentUsers, addNewUser, fetchAllUsers, updateUsername,
  updatePhoneNumber, updateEmailAddress, countTotalUsers, updateSessionUsername, updateUserPassword,
  updateUserRecord, fetchTokenDetails, fetchEmailDetails, fetchToken, fetchStudentRequests,
  fetchStudentRequestsBySemester, updateRequestStatus, updateRequestStatusAndNote, addRequest, getQueueLength, fetchRequestById,
  fetchRequestsByType, fetchRandomRequest, saveNotification, fetchNotifications, deleteNotificationsByStudentId
};

