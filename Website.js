// ** Ali Awadallah 60301637 ** 
// ** Diya Rafat 60301627 ** 

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const business = require('./business.js');
const flash = require('./flash.js');

// Initialize the Express app
let app = express();

// Set up view engine with Handlebars
const handlebars = require('express-handlebars');
app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());

// Middleware for parsing request bodies and cookies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use("/", express.static(__dirname + "/"));

// Custom 404 error handling
function handle404Error(req, res) {
  res.status(404).render("404", { layout: undefined });
}

// Route to render public view
app.get('/', async (req, res) => {
  res.render('PublicView', {
    layout: 'home_layout'
  });
});

// Route to render about us page
app.get('/aboutUs', (req, res) => {
  let Link = "About Us";
  res.render('AboutUs', {
    Link: Link,
    layout: 'home_layout'
  });
});

// Route to render FAQs page
app.get('/FAQS', (req, res) => {
  let Link = "FAQS";
  res.render('FAQS', {
    Link: Link,
    layout: 'home_layout'
  });
});

// Route to render privacy policy page
app.get('/privacyPolicy', (req, res) => {
  let Link = "Privacy Policy";
  res.render('PrivacyPolicy', {
    Link: Link,
    layout: 'home_layout'
  });
});

// Route to render contact us page
app.get('/contactUs', (req, res) => {
  let Link = "Contact Us";
  res.render('ContactUs', {
    Link: Link,
    layout: 'home_layout'
  });
});

// Route to fetch all users
app.get('/api/user', async (req, res) => {
  let users = await business.fetchAllUsers();
  res.send(users);
});

// Route to register a new user
app.post('/api/user', async (req, res) => {
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

// Route to render forget password page
app.get('/forgetPassword', async (req, res) => {
  let resetMsg = req.query.resetMsg;
  res.render('ForgetPassword', { layout: undefined, msg: resetMsg });
});

// Route to handle forget password form submission
app.post('/forgetPassword', async (req, res) => {
  let resetEmail = req.body.resetEmail;
  let resetToken = await business.verifyEmailAndGenerateToken(resetEmail);
  if (resetToken) {
    console.log(`http:/127.0.0.1:8000/reset-password/?resetKey=${resetToken}`);
    let mailResult = await business.sendPasswordResetEmail(resetEmail, resetToken);
    if (mailResult == 0) {
      console.log("Please start the email server");
    }
  }
  res.redirect("/forgetPassword?resetMsg=Check your email account for the reset link");
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
  res.render('ProfileView', {
    layout: 'profile',
    username: username,
    email: email,
    phone: phone,
    userId: userId
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
  res.render('ProfileView', {
    layout: 'admin_layout',
    username: username,
    email: email,
    phone: phone,
    userId: userId
  });
});

// Route to render admin user accounts page
app.get("/admin/userAccounts", async (req, res) => {
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
  let managerUsers = await business.fetchAllManagerUsers();
  res.render("UserAccounts", {
    link: "User Accounts",
    layout: "admin_layout",
    studentUsers: studentUsers,
    managerUsers: managerUsers,
    userId: userId
  });
});

// Route to render registration page
app.get('/registerNow', async (req, res) => {
  let sessionId = req.cookies.projectkey;
  let flashMessage = await flash.getFlash(sessionId);
  let userId = await business.generateNextUserId();
  res.render('Register', { layout: undefined, message: flashMessage, userId: userId });
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

// Handle 404 errors
app.use(handle404Error);

// Start the server
app.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});
