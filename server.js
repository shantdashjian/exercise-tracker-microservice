const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// create schema and model
var Schema = mongoose.Schema;
var exerciseLogSchema = new Schema({
  userId: String,
  exercises: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

var ExerciseLog = mongoose.model('ExerciseLog', exerciseLogSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// routes
// create and save exerciseLog
app.post('/api/exercise/new-user', function(req, res) {
  let exerciseLog = new ExerciseLog({
    userId: req.body.username,
    exercises: []
  });
  exerciseLog.save(function(err, exerciseLog) {
    if (err) res.json({error: err});
    res.json(exerciseLog);
  });
});

// find exerciseLog with userId, add new exercise to it and then save
app.post('/api/exercise/add', function(req, res) {
  ExerciseLog.findOne({userId: req.body.userId}, function(err, exerciseLog) {
    if (err) {
      res.json({error: err});
    } else {
      exerciseLog.exercises.push({
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: new Date(req.body.date)
      });
      exerciseLog.save(function(err, exerciseLog) {
        if (err) {
          res.json({error: err});
        } else {
          res.json(exerciseLog);
        }
      });
    }
  });
});

// get route
app.get('/api/exercise/log', function(req, res) {
  //{userId}[&from][&to][&limit]
  if (req.query.userId == null) {
    res.json({error: 'missing userId'});
  } else {
    ExerciseLog.findOne({userId: req.query.userId}, function(err, exerciseLog) {
      if (err) {
        res.json({error: err});
      } else {
        let exercises = exerciseLog.exercises;
        if (req.query.from != null) {
          exercises = 
            exercises.filter(exercise => 
                                exercise.date >= new Date(req.query.from));
        }
        if (req.query.to != null) {
          exercises = 
            exercises.filter(exercise => 
                                exercise.date <= new Date(req.query.to));
        }
        if (req.query.limit != null) {
          exercises = exercises.slice(0, req.query.limit);
        }
        res.json({log: exercises});
      }
    })
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
