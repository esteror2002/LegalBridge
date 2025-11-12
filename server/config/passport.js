const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // נחפש משתמש קיים לפי אימייל או Google ID
        let user = await User.findOne({
          $or: [{ googleId: profile.id }, { email }],
        });

        if (!user) {
          console.log("משתמש לא נמצא:", email);
          return done(
            null,
            false,
            { message: "לא נמצא משתמש קיים. יש להירשם קודם באתר." }
          );
        }

        // אם למשתמש יש אימייל אבל אין googleId — נוסיף אותו
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }

        console.log(" משתמש מחובר עם Google:", user.email);
        return done(null, user);

      } catch (err) {
        console.error("Error in Google Strategy:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
