const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Middleware to check if user is signed in
const isAuthenticated = (req, res, next) => {
  if (req.cookies.username) {
    return res.redirect("/inbox");
  }
  next();
};

// Home route
app.get("/", isAuthenticated, (req, res) => {
  res.render("home", { title: "Welcome" });
});

// Sign-up page route
// Sign-in page route
//

// Sign-up page route
app.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up", error: null }); // Pass error as null initially
});

// Handle sign-up form submission
app.post("/signup", async (req, res) => {
  const { fullname, username, password, confirmPassword } = req.body;

  // Validate input
  if (!fullname || !username || !password || !confirmPassword) {
    return res.render("signup", {
      title: "Sign Up",
      error: "All fields are required.",
    });
  }

  if (password.length < 6) {
    return res.render("signup", {
      title: "Sign Up",
      error: "Password must be at least 6 characters long.",
    });
  }

  if (password !== confirmPassword) {
    return res.render("signup", {
      title: "Sign Up",
      error: "Passwords do not match.",
    });
  }

  try {
    const connection = await pool.getConnection();

    // Check if the email already exists
    const [existingUser] = await connection.query(
      "SELECT * FROM Users WHERE email = ?",
      [username],
    );
    if (existingUser.length > 0) {
      connection.release();
      return res.render("signup", {
        title: "Sign Up",
        error: "Email address is already in use.",
      });
    }

    // Insert new user into the database
    await connection.query(
      "INSERT INTO Users (fullname, email, password) VALUES (?, ?, ?)",
      [fullname, username, password],
    );
    connection.release();

    // Show welcome message and link to sign-in
    res.render("welcome", {
      title: "Welcome",
      message: "Account created successfully! You can now sign in.",
    });
  } catch (err) {
    console.error(err);
    res.send("Error signing up");
  }
});

app.get("/signin", isAuthenticated, (req, res) => {
  res.render("signin", { title: "Sign In", error: null });
});

// Handle sign-in form submission
app.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM Users WHERE email = ? AND password = ?",
      [username, password],
    );
    connection.release();

    if (rows.length > 0) {
      res.cookie("username", username, { maxAge: 900000, httpOnly: true });
      res.redirect("/inbox");
    } else {
      res.render("signin", {
        title: "Sign In",
        error: "Invalid credentials, try again!",
      });
    }
  } catch (err) {
    console.error(err);
    res.send("Error signing in");
  }
});

// Inbox page route (protected)
app.get("/inbox", (req, res) => {
  if (!req.cookies.username) {
    return res.redirect("/signin");
  }
  res.render("inbox", { title: "Inbox", user: req.cookies.username });
});

// Sign-out route
app.get("/signout", (req, res) => {
  res.clearCookie("username");
  res.redirect("/");
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
