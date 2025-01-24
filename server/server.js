const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware to parse incoming requests
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files but disable default index.html behavior
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Set up nodemailer transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'docpluswebai@gmail.com', // Your email address
    pass: 'iozd ipjo tdlb sqvm'   // Your email password (consider using App Password for security)
  }
});

// Function to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = (email, otp) => {
  const mailOptions = {
    from: 'docplusweb@gmail.com',
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    html: `<p>Your OTP for password reset is: <b>${otp}</b>.</p><p>It will expire in 10 minutes.</p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending OTP email:', error);
    } else {
      console.log('OTP email sent: ' + info.response);
    }
  });
};

// Function to send welcome email
const sendWelcomeEmail = (email) => {
  const mailOptions = {
    from: 'docplusweb@gmail.com',
    to: email,
    subject: 'Welcome to Our Service',
    text: 'Thank you for signing up! We are glad to have you on board.'
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Explicitly route root (/) to login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Mock authentication route (login)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

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
  const { username, email, password } = req.body;

  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    let users = JSON.parse(data);

    const userExists = users.some((u) => u.username === username || u.email === email);

    if (userExists) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    users.push({ username, email, password });

    fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving user' });
      }

      // Send confirmation email
      sendWelcomeEmail(email);

      res.status(201).json({ message: 'User created successfully' });
    });
  });
});

// Forgot password route
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    let users = JSON.parse(data);
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP and expiry time
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP and expiry to user
    user.resetOTP = otp;
    user.resetOTPExpiry = otpExpiry;

    fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving OTP' });
      }

      // Send OTP email
      sendOTPEmail(email, otp);
      res.json({ message: 'OTP sent to your email' });
    });
  });
});

// Verify OTP route
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    let users = JSON.parse(data);
    const user = users.find((u) => u.email === email);

    if (!user || user.resetOTP !== otp || user.resetOTPExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP verified
    delete user.resetOTP;
    delete user.resetOTPExpiry;

    fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error verifying OTP' });
      }

      res.json({ message: 'OTP verified, you can reset your password' });
    });
  });
});

// Reset password route
app.post('/reset', (req, res) => {
  const { email, newPassword } = req.body;

  fs.readFile(path.join(__dirname, 'users.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    let users = JSON.parse(data);
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the password
    user.password = newPassword;

    fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving new password' });
      }

      res.json({ message: 'Password reset successful' });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
