const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend('re_U4NdwrQ5_DXyYVHP1RvPHHFbJD4o9cDPb');

// Add these two functions to your existing authController:

exports.resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ message: 'If an account exists, reset instructions sent.' });
    }
    
    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save code to user
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Send email
    await resend.emails.send({
      from: 'Coastal Fitness <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset Code - Coastal Fitness',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #244398;">Password Reset</h2>
          <p>Your password reset code is:</p>
          <h1 style="color: #244398; font-size: 36px; letter-spacing: 5px;">${resetCode}</h1>
          <p>This code will expire in 1 hour.</p>
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    
    res.json({ message: 'Reset code sent to email' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error sending reset email' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params; // This is the code
    const { password } = req.body;
    
    const user = await User.findOne({
      resetPasswordCode: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
};
