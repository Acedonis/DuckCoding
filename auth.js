require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("./database");

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://upgraded-zebra-q7wxv5jxr55j3xqxq-3000.app.github.dev/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await db.users.findOne({ googleId: profile.id });
    if (!user) {
      user = await db.users.insert({
        googleId: profile.id,
        username: profile.displayName,
        email: profile.emails[0].value,
        avatar: profile.photos[0].value,
        createdAt: new Date()
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.users.findOne({ _id: id });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
