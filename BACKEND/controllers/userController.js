const userModel = require('../models/userModel');
const jsonwebtoken = require('jsonwebtoken');

// Register a new user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newUser = await userModel.register(name, email, password);
        res.status(201).json(newUser);
        console.log(req);
    }           
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};      

// Login a user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.login(email, password);
        if (user) {
            const token = newToken(user);
            // console.log('Generated Token:', token);
            // console.log('JWT_SECRET:', process.env.JWT_SECRET);

            res.status(200).json({
                message: 'Login successful',
                token
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const newToken = (user) => {
    // generate new token
    const token = jsonwebtoken.sign(
        { email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return token;
}

// get user profile 
const getUserProfile = async (req, res) => {
    try {
        // Email is available from req.user (set by auth middleware)
        const email = req.user.email;
        const userProfile = await userModel.getUserProfile(email);

        if (!userProfile) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(userProfile);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};