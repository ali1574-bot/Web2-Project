// ** Ali Awadallah 60301637 ** 
// ** Diya Rafat 60301627 ** 

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const business = require('./business.js');
const flash = require('./flash.js');
const crypto = require('crypto');



// Initialize the Express app
let app = express();

// Set up view engine with Handlebars
const handlebars = require('express-handlebars');
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine({
  helpers: {
    eq: (a, b) => a === b // Define the "eq" helper
  }
}));

// Middleware for parsing request bodies and cookies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use("/", express.static(__dirname + "/"));
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });
app.use(cookieParser());
app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  
  // Handle CSRF token errors 
  res.status(403);
  res.send('Form tampered with or session expired');
});



// Custom 404 error handling
function handle404Error(req, res) {
  res.status(404).render("404", { layout: undefined });
}

// Route to redirect to the login page immediately
app.get('/', (req, res) => {
  res.redirect('/login');
});



// Route to fetch all users
app.get('/api/user', async (req, res) => {
  let users = await business.fetchAllUsers();
  res.send(users);
});

// Route to register a new user
app.post('/api/user', csrfProtection, async (req, res) => {
  let data = req.body;
  data.registeredDate = new Date(data.registeredDate);

  await business.registerNewUser(data);
  let token = await business.verifyEmailAndGenerateToken(data.email);
  if (token) {
    console.log(`http:/127.0.0.1:8000/verify-email?token=${token}`);
    let mailResult = await business.sendEmailVerificationLink(data.email, token);
    if (mailResult == 0) {
      console.log("Please start the email server");
    }
  }
  res.redirect('/login?message=Check your email for verification');
});

// Route to verify old password
app.post('/api/user/:username/password-verify', async (req, res) => {
  let username = req.params.username;
  let password = req.body.oldPassword;
  let result = await business.verifyCurrentPassword(username, password);
  res.send({ flag: result });
});

// Route to update user password
app.patch('/api/user/:username/password', async (req, res) => {
  let username = req.params.username;
  let password = req.body.newPassword;
  await business.updateUserPasswordByUsername(username, password);
  res.send('ok');
});

// Route to render login page
app.get('/login', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let flashMessage = await flash.getFlash(sessionId);
  res.render('Login', { layout: undefined, message: flashMessage });
});

// Route to handle login form submission
app.post('/login-form', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let accountType = await business.validateLoginCredentials(username, password);

  if (!accountType) {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Invalid Credentials");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  } else if (accountType === "unverified") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please verify your email before logging in.");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  } else {
    let sessionData = await business.createNewSession({
      userType: accountType,
      username: username
    });
    res.cookie('projectkey', sessionData.sessionKey, { expires: sessionData.expiry });
    if (sessionData.data.userType == "admin") {
      res.redirect("/admin");
    } else {
      res.redirect(`/student`);
    }
  }
});



// Route to handle forget password form submission
app.post('/forgetPassword', async (req, res) => {
  let resetEmail = req.body.resetEmail;
  let resetToken = await business.verifyEmailAndGenerateToken(resetEmail);
  
  if (resetToken) {
    // send email
    let mailResult = await business.sendPasswordResetEmail(resetEmail, resetToken);
    if (mailResult == 0) {
      console.log("Email sending failed - please check email server configuration");
      return res.json({ success: false });
    }
    return res.json({ success: true });
  }
  
  // Always return success to prevent email enumeration
  return res.json({ success: true });
});


// Route to render reset password page
app.get('/reset-password', async (req, res) => {
  let resetKey = Number(req.query.resetKey);
  let resetDetails = await business.fetchTokenDetails(resetKey);
  if (resetDetails) {
    let resetUser = resetDetails.email;
    let resetMessage = undefined;
    res.render("ResetPassword", { layout: undefined, user: resetUser, message: resetMessage, token: resetKey });
  } else {
    let resetMessage = true;
    res.render("ResetPassword", { layout: undefined, message: resetMessage });
  }
});

// Route to handle reset password form submission
app.post('/reset-password', async (req, res) => {
  let resetUser = req.body.user;
  let resetPassword = req.body.password;
  await business.updateUserPassword(resetUser, resetPassword);
  await business.removeToken(Number(req.body.token));
  res.redirect('/login?message=Your password has been reset successfully');
});

// Route to render student profile page
app.get('/student', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  if (!sessionData || sessionData.data.userType != "student") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let username = sessionData.data.username;
  let [email, phone] = await business.fetchUserContactDetails(username);
  let userId = await business.retrieveUserIdByUsername(username);

  // Fetch notifications for the student
  let notifications = await business.fetchNotifications(username);

  res.render('StudentHomePage', {
    layout: 'profile',
    username: username,
    email: email,
    phone: phone,
    userId: userId,
    notifications: notifications // Pass notifications to the template
  });
});

// Route to update username
app.patch('/api/user/:username/username', async (req, res) => {
  let oldUsername = req.params.username;
  let newUsername = req.body.newuser;
  await business.updateUserUsername(oldUsername, newUsername);
  res.send('ok');
});

// Route to update phone number
app.patch('/api/user/:username/phone', async (req, res) => {
  let newPhone = req.body.newPhone;
  let username = req.params.username;
  await business.updateUserPhone(newPhone, username);
  res.send('ok');
});

// Route to update email address
app.patch('/api/user/:username/email', async (req, res) => {
  let newEmail = req.body.newEmail;
  let username = req.params.username;
  await business.updateUserEmail(newEmail, username);
  res.send('ok');
});

// Route to handle logout
app.get("/logout", async (req, res) => {
  let key = req.cookies.projectkey;
  await business.removeSession(key);
  res.cookie('projectkey', '');
  res.redirect('/login');
});

// Route to render admin dashboard
app.get("/admin", async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  if (!sessionData || sessionData.data.userType != "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let username = sessionData.data.username;
  let userId = await business.retrieveUserIdByUsername(username);
  let totalUsers = await business.countTotalUsers();

  res.render("AdminDash", {
    layout: 'admin_layout',
    totalUsers: totalUsers,
    userId: userId
  });
});

// Route to render admin profile page
app.get("/admin/profile", async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  if (!sessionData || sessionData.data.userType != "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let username = sessionData.data.username;
  let [email, phone] = await business.fetchUserContactDetails(username);
  let userId = await business.retrieveUserIdByUsername(username);
  res.render('StudentHomePage', {
    layout: 'admin_layout',
    username: username,
    email: email,
    phone: phone,
    userId: userId
  });
});

// Route to render admin Student accounts page
app.get("/admin/StudentAccounts", async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);
  let username = sessionData.data.username;
  let userId = await business.retrieveUserIdByUsername(username);

  if (!sessionData || sessionData.data.userType != "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let studentUsers = await business.fetchAllStudentUsers();
  res.render("StudentAccounts", {
    link: "User Accounts",
    layout: "admin_layout",
    studentUsers: studentUsers,
    userId: userId
  });
});

// Route to render admin queue management page
app.get('/admin/queue-management', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  // Fetch queue details for each request type
  let queueDetails = await business.fetchQueueDetails();

  // Render the Admin Queue Management page
  res.render('QueueManagement', {
    layout: 'admin_layout',
    queueDetails: queueDetails
  });
});

// Updated register route to include CSRF token
app.get('/registerNow', csrfProtection, async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let flashMessage = await flash.getFlash(sessionId);
  let userId = await business.generateNextUserId();
  res.render('Register', { 
    layout: undefined, 
    message: flashMessage, 
    userId: userId,
    csrfToken: req.csrfToken() // Add CSRF token to the view
  });
});

// Route to handle email verification
app.get('/verify-email', async (req, res) => {
  let token = Number(req.query.token);
  let userDetails = await business.fetchTokenDetails(token);

  if (userDetails) {
    userDetails.isVerified = true;
    delete userDetails.token;
    await business.updateUserVerificationStatus(userDetails);
    res.redirect('/login?message=Your email has been verified. You can now log in.');
  } else {
    res.redirect('/login?message=Invalid verification token.');
  }
});

// Route to render student requests page
app.get('/student/my-requests', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is a student
  if (!sessionData || sessionData.data.userType !== "student") {
    res.redirect("/login");
    return;
  }

  // Fetch the student's requests
  let studentId = sessionData.data.username;
  let semester = req.query.semester || "all"; // Get the semester filter from the query string
  let requests = await business.fetchStudentRequestsBySemester(studentId, semester);



  // Render the MyRequests page with the fetched data
  res.render('MyRequests', {
    layout: 'profile', // Ensure this layout exists
    requests: requests,
    semesters: ['Fall 2025', 'Spring 2025'], // Example semesters
    selectedSemester: semester // Pass the selected semester to the template
  });
});

// Route to render submit request page
app.get('/student/submit-request', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

    if (!sessionData || sessionData.data.userType !== "student") {
    res.redirect("/login");
    return;
  }

    res.render('SubmitRequest', {
    layout: 'profile', 
    username: sessionData.data.username
  });
});

// Route to cancel a student request
app.patch('/api/student/cancel-request/:requestId', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is a student
  if (!sessionData || sessionData.data.userType !== "student") {
    res.status(403).send("Unauthorized");
    return;
  }

  let requestId = req.params.requestId;

  try {
    // Cancel the request
    await business.cancelStudentRequest(requestId);
    res.send("Request canceled");
  } catch (error) {
    console.error("Error canceling request:", error);
    res.status(500).send("Error canceling request");
  }
});

// Route to handle submitting a new request
app.post('/api/student/submit-request', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is a student
  if (!sessionData || sessionData.data.userType !== "student") {
    console.error("Unauthorized access or invalid session.");
    res.status(403).send("Unauthorized");
    return;
  }

  let studentId = sessionData.data.username;
  let { type, semester, description } = req.body;

  try {
    await business.addStudentRequest({
      studentId,
      type,
      semester, // Ensure semester is passed here
      description,
      status: "Pending",
      createdAt: new Date(),
      estimatedCompletion: await business.calculateEstimatedCompletion(type)
    });
    res.status(200).send("Request submitted successfully");
  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).send("Error submitting request");
  }
});

// Route to delete all notifications for the logged-in user
app.delete('/api/notifications', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid
  if (!sessionData || sessionData.data.userType !== "student") {
    res.status(403).send("Unauthorized");
    return;
  }

  let studentId = sessionData.data.username;

  try {
    await business.deleteAllNotifications(studentId);
    res.status(200).send("Notifications deleted successfully");
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).send("Error deleting notifications");
  }
});

// Route to process a request by admin
app.patch('/api/admin/process-request/:requestId', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    res.status(403).send("Unauthorized");
    return;
  }

  let requestId = req.params.requestId;

  try {
    // Process the request
    await business.processRequest(requestId);
    res.send("Request processed successfully");
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Error processing request");
  }
});

// Route to render admin queue requests page
app.get('/admin/queue/:type', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let requestType = req.params.type; // Get the request type from the URL
  let requests = await business.fetchRequestsByType(requestType);

  // Render the page to display all requests for the selected queue
  res.render('QueueRequests', {
    layout: 'admin_layout',
    requestType: requestType,
    requests: requests
  });
});

// Route to render request details page
app.get('/admin/request/:id', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  let requestId = req.params.id;
  let requestDetails = await business.fetchRequestById(requestId); // Error occurs here

  res.render('RequestDetails', {
    layout: 'admin_layout',
    request: requestDetails
  });
});

// Route to handle resolving or rejecting a request
app.post('/admin/request/:id/resolve', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    res.status(403).send("Unauthorized");
    return;
  }

  let requestId = req.params.id;
  let { action, note } = req.body;

  try {
    // Fetch the request details to get the type
    let requestDetails = await business.fetchRequestById(requestId);

    if (!requestDetails) {
      res.redirect('/admin/queue-management'); // Redirect to queue management if request not found
      return;
    }

    if (action === "resolve") {
      await business.updateRequestStatus(requestId, "Resolved", note);
    } else if (action === "reject") {
      await business.updateRequestStatus(requestId, "Rejected", note);
    }

    // Redirect to the queue page for the specific type
    res.redirect(`/admin/queue/${requestDetails.type}`);
  } catch (error) {
    console.error("Error resolving/rejecting request:", error);
    res.status(500).send("Error resolving/rejecting request");
  }
});

// Route to fetch a random request
app.get('/admin/random-request', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let sessionData = await business.fetchSessionData(sessionId);

  // Check if the session is valid and the user is an admin
  if (!sessionData || sessionData.data.userType !== "admin") {
    let sessionData = await business.createNewSession({
      userType: "",
      username: ""
    });
    await flash.setFlash(sessionData.sessionKey, "Please Login");
    res.cookie('projectkey', sessionData.sessionKey, sessionData.expiry);
    res.redirect("/login");
    return;
  }

  try {
    let randomRequest = await business.fetchRandomRequest();
    if (!randomRequest) {
      // Redirect to the queue management page if no pending requests are available
      res.redirect('/admin/queue-management');
      return;
    }

    res.render('RequestDetails', {
      layout: 'admin_layout',
      request: randomRequest
    });
  } catch (error) {
    console.error("Error fetching random request:", error);
    res.status(500).send("Error fetching random request");
  }
});

// Handle 404 errors
app.use(handle404Error);

// Start the server
app.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});
