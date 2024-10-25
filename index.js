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
// app.set("view engine", "ejs");
app.set("view engine", "hbs");
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
app.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up", error: null });
});

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
      fullname: req.body.fullname,
      username: req.body.email     // Added `email` variable
    });
  } catch (err) {
    console.error(err);
    res.send("Error signing up");
  }
});
// app.post("/signup", async (req, res) => {
//   const { fullname, username, password, confirmPassword } = req.body;

//   // Validate input
//   if (!fullname || !username || !password || !confirmPassword) {
//     return res.render("signup", {
//       title: "Sign Up",
//       error: "All fields are required.",
//     });
//   }

//   if (password.length < 6) {
//     return res.render("signup", {
//       title: "Sign Up",
//       error: "Password must be at least 6 characters long.",
//     });
//   }

//   if (password !== confirmPassword) {
//     return res.render("signup", {
//       title: "Sign Up",
//       error: "Passwords do not match.",
//     });
//   }

//   try {
//     const connection = await pool.getConnection();

//     // Check if the email already exists
//     const [existingUser] = await connection.query(
//       "SELECT * FROM Users WHERE email = ?",
//       [username],
//     );
//     if (existingUser.length > 0) {
//       connection.release();
//       return res.render("signup", {
//         title: "Sign Up",
//         error: "Email address is already in use.",
//       });
//     }

//     // Insert new user into the database
//     await connection.query(
//       "INSERT INTO Users (fullname, email, password) VALUES (?, ?, ?)",
//       [fullname, username, password],
//     );
//     connection.release();

//     // Show welcome message and link to sign-in
//     res.render("welcome", {
//       title: "Welcome",
//       message: "Account created successfully! You can now sign in.",
//     });
//   } catch (err) {
//     console.error(err);
//     res.send("Error signing up");
//   }
// });

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
      const user = rows[0];
      // Set cookies for user session
      res.cookie("username", username, { maxAge: 900000, httpOnly: true });
      res.cookie("fullname", user.fullname, { maxAge: 900000, httpOnly: true });
      res.redirect("/inbox");
    } else {
      res.render("signin", { title: "Sign In", error: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.send("Error signing in");
  }
});

// Inbox page route (protected)
// app.get("/inbox", async (req, res) => {
//   if (!req.cookies.username) {
//     return res.redirect("/signin");
//   }

//   try {
//     const connection = await pool.getConnection();

//     // Assuming receiver_id is the email of the logged-in user
//     const receiverId = req.cookies.username;

//     // Query to fetch emails for the logged-in user
//     const [emails] = await connection.query(
//       "SELECT id, sender_id, receiver_id, subject, body, timestamp FROM Emails WHERE receiver_id = ?",
//       [receiverId]
//     );

//     connection.release();

//     // Render the inbox page with user and emails data
//     res.render("inbox", {
//       title: "Inbox",
//       user: { fullname: receiverId },
//       emails: emails
//     });
//   } catch (err) {
//     console.error(err);
//     res.send("Error fetching inbox data");
//   }
// });

app.get("/inbox", (req, res) => {
  if (!req.cookies.username) {
      return res.redirect("/signin");
  }

  // Fetch emails for the logged-in user (implement this function)
  const emails = fetchEmailsForUser(req.cookies.username); // Replace with your actual method to get emails

  // Assume user object includes fullname
  const user = { fullname: "User's Full Name" }; // Replace with actual user fetching logic

  res.render("inbox", { user, emails });
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

// Middleware to protect routes
const requireAuth = (req, res, next) => {
  if (!req.cookies.username) {
    return res.status(403).render("accessDenied");
  }
  next();
};

// Inbox page
app.get("/inbox", requireAuth, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [emails] = await connection.query(
      `
      SELECT e.id, e.subject, e.body, e.timestamp, u.fullname AS sender_name 
      FROM Emails e 
      JOIN Users u ON e.sender_id = u.id 
      WHERE e.receiver_id = (SELECT id FROM Users WHERE email = ?)
      ORDER BY e.timestamp DESC
    `,
      [req.cookies.username],
    );
    connection.release();
    res.render("inbox", {
      title: "Inbox",
      user: { fullname: req.cookies.fullname },
      emails,
    });
  } catch (err) {
    console.error(err);
    res.send("Error loading inbox");
  }
});

// Compose, Outbox routes can follow a similar pattern with different logic.

async function fetchEmailsForUser(receiverId) {
  let connection;

  try {
      connection = await pool.getConnection();

      // Query to fetch emails where the receiver_id matches the provided user ID
      const [emails] = await connection.query(
          "SELECT * FROM Emails WHERE receiver_id = ? ORDER BY timestamp DESC",
          [receiverId]
      );

      return emails; // Return the list of emails
  } catch (error) {
      console.error("Error fetching emails:", error);
      throw error; // Optionally rethrow the error for handling upstream
  } finally {
      if (connection) {
          connection.release(); // Release the database connection
      }
  }
}