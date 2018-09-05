/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

const db = mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
const Schema = mongoose.Schema;
const ReplySchema = new Schema({
  text: {
    type: String,
    required: true
  },
  delete_password: {
    type: String,
    required: true
  },
  created_on: String,
  reported: Boolean
});
const Reply = mongoose.model('Reply', ReplySchema);

const ThreadSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  delete_password: {
    type: String,
    required: true
  },
  created_on: String,
  bumped_on: String,
  reported: Boolean,
  replies: [{
    type: ReplySchema,
    default: []
  }]
});
const Thread = mongoose.model('Thread', ThreadSchema);

const BoardSchema = new Schema({
  name: String,
  threads: [{
    type: ThreadSchema,
    default: []
  }]
});
const Board = mongoose.model('Board', BoardSchema);

module.exports = (app) => {
  
  app.route('/api/threads/:board')
    .post((req, res) => {
      const board = req.params.board;
      const created = new Date();
      const newThread = new Thread({
        text: req.body.text,
        delete_password: req.body.delete_password,
        created_on: created,
        bumped_on: created,
        reported: false
      });
      Board.findOne({name: board}, (err, boardData) => {
        if (err) {
          console.log('Error finding board for post ', err);
        }
        boardData.threads.push(newThread);
        boardData.save((err) => {
          if (err) {
            console.log('Error saving new post ', err);
          }
          res.send(newThread);
        });
      });
    })
  
    .get((req, res) => {
      const board = req.params.board;
      console.log(board);
      Board.findOne({name: board}, (err, data) => {
        if (err) {
          console.log('Error retrieving board data ', err);
        }
        if (data !== null) {
          res.send(data.threads.sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on)).slice(0,10));
        } else {
          Board.create({name: board}, (err, data) => {
            if (err) {
              console.log('Error storing new board in database ', err);
            }
            res.send(data.threads);
          });
        }
      });
    });
    
  app.route('/api/replies/:board');

};
