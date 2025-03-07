const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Połączenie z bazą MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definicja schematów i modeli
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// Strona główna
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users – tworzenie nowego użytkownika
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    const newUser = new User({ username, log: [] });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.json({ error: 'Error saving user' });
  }
});

// GET /api/users – pobranie listy wszystkich użytkowników
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').exec();
    res.json(users);
  } catch (err) {
    res.json({ error: 'Error fetching users' });
  }
});

// POST /api/users/:_id/exercises – dodawanie ćwiczenia do użytkownika
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date) : new Date();

    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    const exercise = {
      description: description,
      duration: parseInt(duration),
      date: exerciseDate,
    };

    user.log.push(exercise);
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    res.json({ error: 'Error saving exercise' });
  }
});

// GET /api/users/:_id/logs – pobieranie loga ćwiczeń użytkownika
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    let { from, to, limit } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });

    // Pobierz oryginalny log (jako tablica dokumentów typu Date)
    let log = user.log;

    // Filtrowanie po dacie, jeśli podano parametry from/to
    if (from) {
      const fromDate = new Date(from);
      log = log.filter(ex => ex.date >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      log = log.filter(ex => ex.date <= toDate);
    }
    // Jeśli podano limit, ogranicz liczbę wpisów
    if (limit) {
      log = log.slice(0, parseInt(limit));
    }

    // Mapowanie wpisów loga na obiekty z odpowiednim formatem daty
    const formattedLog = log.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: formattedLog.length,
      log: formattedLog,
    });
  } catch (err) {
    res.json({ error: 'Error fetching logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
