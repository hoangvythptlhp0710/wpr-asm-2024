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
// app.set("view engine", "hbs");
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

app.get("/email/:id", async (req, res) => {
  const emailId = req.params.id;
  const loggedInUser = { fullname: req.cookies.fullname }
  try {
    const connection = await pool.getConnection();
    const [emails] = await connection.query("select u.fullname, e.`timestamp`, e.body, e.subject from Emails e join Users u where e.sender_id = u.id and e.id = ?", [emailId]);
    connection.release();

    if (emails.length > 0) {
      res.render("emailDetail", { title: "Email Detail", user: loggedInUser, email: emails[0] });
    } else {
      res.status(404).send("Email not found");
    }
  } catch (err) {
    console.error("Error fetching email details:", err);
    res.status(500).send("Error retrieving email details");
  }
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
      console.log(user);
      // Set cookies for user session
      res.cookie("username", username, { maxAge: 900000, httpOnly: true });
      res.cookie("fullname", user.fullname, { maxAge: 900000, httpOnly: true });
      res.cookie("userId", user.id, { maxAge: 900000, httpOnly: true }); // Save user ID in cookie
      res.redirect("/inbox");
    } else {
      res.render("signin", { title: "Sign In", error: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.send("Error signing in");
  }
});

app.get("/inbox", async (req, res) => {
  if (!req.cookies.fullname) {
    return res.redirect("/signin");
  }

  const userId = req.cookies.userId;
  const page = parseInt(req.query.page) || 1; // Get the current page from the query params, default to 1
  const emailsPerPage = 5;
  const offset = (page - 1) * emailsPerPage;

//   try {
//     const emails = await fetchEmailsForUser(userId);
//     console.log(req.cookies.userId); // Fetch emails
//     console.log('Fetched emails:', emails); // Check what you get here

//     const user = { fullname: req.cookies.fullname }; // Replace with actual user fetching logic
//     res.render("inbox", { user, emails });
//   } catch (error) {
//     console.error("Error fetching emails:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

try {
  const connection = await pool.getConnection();

  // Query to get the emails for the current page
  const [emails] = await connection.query(
    "SELECT e.id, e.sender_id, e.subject, e.`timestamp`, e.body FROM Emails e JOIN Users u where e.receiver_id = u.id and e.receiver_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
    [userId, emailsPerPage, offset]
  );

  // Query to get the total count of emails for pagination
  const [[{ count }]] = await connection.query(
    "SELECT COUNT(*) as count FROM Emails WHERE receiver_id = ?",
    [userId]
  );

  const totalPages = Math.ceil(count / emailsPerPage);

  connection.release();

  res.render("inbox", {
    user: { fullname: req.cookies.fullname },
    emails,
    currentPage: page,
    totalPages,
  });
} catch (err) {
  console.error("Error fetching emails:", err);
  res.status(500).send("Error retrieving inbox emails");
}
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


async function fetchEmailsForUser(receiverId) {
  let connection;

  try {
      connection = await pool.getConnection();
      console.log(receiverId);
      const [emails] = await connection.query(
          "SELECT e.id, e.sender_id, e.subject, e.`timestamp`, e.body FROM Emails e JOIN Users u where e.receiver_id = u.id and e.receiver_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
          [receiverId, emailsPerPage, offset]
      );

      return emails;
  } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
  } finally {
      if (connection) {
          connection.release();
      }
  }
}