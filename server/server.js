const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware to parse incoming requests
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (login.html, index.html)
app.use(express.static(path.join(__dirname, '../public')));

// Mock authentication route (login)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Read the mock database
  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    const users = JSON.parse(data);
    const user = users.find((u) => u.username === username && u.password === password);

    if (user) {
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// Sign-up route
app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  // Read the mock database
  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    let users = JSON.parse(data);

    // Check if the username already exists
    const userExists = users.some((u) => u.username === username);

    if (userExists) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    // Add the new user
    users.push({ username, password });

    // Write the updated data back to the file
    fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving user' });
      }

      res.status(201).json({ message: 'User created successfully' });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
