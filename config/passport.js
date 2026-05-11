const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('Google OAuth Profile:', profile);
                
                // Check if user already exists
                let user = await User.findOne({ email: profile.emails[0].value });
                
                if (user) {
                    // User exists, update Google info if needed
                    if (!user.profileImage && profile.photos && profile.photos[0]) {
                        user.profileImage = profile.photos[0].value;
                        await user.save();
                    }
                    return done(null, user);
                } else {
                    // Create new user from Google profile
                    const nameParts = profile.displayName.split(' ');
                    const newUser = await User.create({
                        firstName: nameParts[0] || profile.name.givenName || 'Google',
                        surname: nameParts.slice(1).join(' ') || profile.name.familyName || 'User',
                        email: profile.emails[0].value,
                        phone: `google_${profile.id}`, // Placeholder phone for Google users
                        password: 'google_oauth_' + Math.random().toString(36).slice(-8), // Random password for Google users
                        isEmailVerified: true,
                        isEmailVerifiedUser: true,
                        profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
                        role: 'user'
                    });
                    
                    console.log('Created new Google user:', newUser.email);
                    return done(null, newUser);
                }
            } catch (error) {
                console.error('Google OAuth Error:', error);
                return done(error, null);
            }
        }
    )
);