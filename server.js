const express = require('express');
const multer = require('multer')
const mongoose = require('mongoose')
const app = express();
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.set('view engine', 'ejs')

app.use(express.static('public'));
app.use(express.static('upload'));
app.use(express.urlencoded({ extended: false }))
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/PassportBlog')

const { userModel } = require('./schemas/userschema.js')
const { blogModel } = require('./schemas/blogschema.js')

passport.use(new LocalStrategy({ usernameField: 'email', }, async function (email, password, done) {
    try {
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return done(null, false);
        }
        if (user.password !== password) {
            return done(null, false);
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const user = await userModel.findById(id);
        cb(null, user);
    } catch (err) {
        cb(err);
    }
});

const auth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next()
    } else {
        res.redirect('/login')
    }
}

const storage = multer.diskStorage(
    {
        destination: (req, file, cb) => {
            return cb(null, './upload')
        },
        filename: (req, file, cb) => {
            return cb(null, Date.now() + file.originalname)
        }
    }
)

var upload = multer({ storage: storage }).single('file');

app.get('/', (req, res) => {
    const user = req.user;
    res.render('./pages/home', { username: user ? user.username : null })
})

app.get('/blogs', auth, async (req, res) => {
    try {
        const user = req.user
        const blogs = await blogModel.find();
        res.render('./Pages/blogs', { blogs: blogs, username: user ? user.username : null });
    } catch (err) {
        console.log(err);
    }
})

app.get('/addblog', (req, res) => {
    const user = req.user
    res.render('./pages/addblog', { username: user ? user.username : null })
})

app.post('/addblog', async (req, res) => {
    upload(req, res, async () => {
        if (req.file) {
            const user = req.user
            var details = {
                title: req.body.title,
                description: req.body.description,
                blogimage: req.file.filename,
                username: user.username
            }
            const blog = new blogModel(details)
            try {
                await blog.save();
                res.redirect('/blogs');
            } catch (err) {
                console.error(err);
            }
        } else {

        }
    })
})

app.get('/register', (req, res) => {
    const user = req.user;
    res.render('./pages/register', { username: user ? user.username : null })
})

app.post('/register', async (req, res) => {
    const users = req.body;
    try {
        const register = new userModel(users);
        await register.save();
        res.redirect('/login')
    } catch (err) {
        console.log(err);
    }
})

app.get('/login', (req, res) => {
    const user = req.user;
    res.render('./pages/login', { username: user ? user.username : null })
})

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }))

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
})

app.listen(3000, () => {
    console.log(`server Start at http://localhost:3000`);
})