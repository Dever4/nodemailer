require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { QuickDB } = require('quick.db');
const { MongoDriver } = require('quickmongo');
const crypto = require('crypto');
const validator = require('validator');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const port = process.env.PORT || 3000;
const driver = new MongoDriver(process.env.URL);
const verification = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: 'nkaydata@gmail.com', 
    pass: 'uska rhro giax lkpx',
  },
});

// Function to generate OTP
const generateOtp = () => {
  return crypto.randomBytes(3).toString('hex');
};

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: 'nkaydata@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email.');
  }
};

const sendOtpSMS = async (phoneNumber, otp) => {
  const smsApiUrl = 'https://api.twilio.com';
  const smsApiKey = 'your-sms-api-key';

  try {
    await axios.post(smsApiUrl, {
      to: phoneNumber,
      message: `Your OTP code is: ${otp}`,
      apiKey: smsApiKey,
    });
  } catch (error) {
    console.error('Error sending OTP SMS:', error);
    throw new Error('Failed to send OTP SMS.');
  }
};

app.post('/send-otp', async (req, res) => {
  const { method, contact } = req.body;

  if (!method || !contact) {
    return res.status(400).json({ error: 'Method and contact are required.' });
  }

  let otp;
  if (method === 'email') {
    if (!validator.isEmail(contact)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const existingEmails = ['user1@example.com', 'user2@example.com'];
    if (!existingEmails.includes(contact)) {
      return res.status(404).json({ error: 'Email does not exist.' });
    }

    otp = generateOtp();
    verification.set(contact, otp);

    try {
      await sendOtpEmail(contact, otp);
      return res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to send OTP email.' });
    }
  }

  if (method === 'phone') {
    if (!validator.isMobilePhone(contact, 'any', { strictMode: true })) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    otp = generateOtp();
    verification.set(contact, otp);

    try {
      await sendOtpSMS(contact, otp);
      return res.status(200).json({ message: 'OTP sent to phone' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to send OTP SMS.' });
    }
  }

  return res.status(400).json({ error: 'Invalid method. Please use "email" or "phone".' });
});

app.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body;

  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Missing identifier or OTP.' });
  }

  const storedOtp = verification.get(identifier);

  if (storedOtp === otp) {
    verification.delete(identifier);
    res.status(200).json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// Export the app as the handler for Vercel
module.exports = app;
