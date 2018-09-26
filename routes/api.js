'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

// use test separate database to not clog the main one with junk data
const db = process.env.NODE_ENV === 'test' ? mongoose.connect(process.env.MONGO_URI_TEST, { useNewUrlParser: true })
                                             : mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
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
  board: {
    type: String,
    required: true
  },
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
  
  app.route('/api/home')
    .get((req, res) => {
      Board.find({}, (err, data) => {
        if (err) {
          console.log('Error finding data for homepage ', err);
        }
        let trimmedReplies = [];
        for (let i=0; i < data.length; i++) {
          const boardTrimmedReplies = data[i].threads.map((thread) => ({ // remove passwords and report booleans
            board: thread.board,
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replyCount: thread.replies.length, 
            replies: thread.replies.slice(-3).map((reply) => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }))
          }));
          boardTrimmedReplies.forEach((reply) => trimmedReplies.push(reply));
        }
        res.send(trimmedReplies.sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on)).slice(0,10));
      });
    });
  
  app.route('/api/threads/:board')
    .post((req, res) => {
      const board = req.params.board;
      const created = new Date();
      const newThread = new Thread({
        board,
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
          res.redirect('/b/' + board);
        });
      });
    })
  
    .get((req, res) => {
      const board = req.params.board;
      Board.findOne({name: board}, (err, data) => {
        if (err) {
          console.log('Error retrieving board data ', err);
        }
        if (data !== null) {
          // The spread operator would make this much nicer...
          const trimmedReplies = data.threads.map((thread) => ({ // remove passwords and report booleans
            board: thread.board,
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replyCount: thread.replies.length, 
            replies: thread.replies.slice(-3).map((reply) => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }))
          }));
          res.send(trimmedReplies.sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on)).slice(0,10));
        } else {
          Board.create({name: board}, (err, data) => {
            if (err) {
              console.log('Error storing new board in database ', err);
            }
            res.send(data.threads);
          });
        }
      });
    })
  
    .put((req, res) => {
      const thread_id = req.body.report_id;
      Board.findOne({name: req.params.board}, (err, data) => {
        if (err) {
          console.log('Error finding thread ', err);
        }
        const currentThread = data.threads.filter((thread) => thread._id.toString() === thread_id)[0];
        const currentThreadIndex = data.threads.indexOf(currentThread);
        currentThread.reported = true;
        data.threads[currentThreadIndex] = currentThread;
        data.save((err) => {
          if (err) {
            console.log('Error reporting thread ', err);
          }
          res.send('success');
        });
      });
    })
  
    .delete((req, res) => {
      const thread_id = req.body.thread_id;
      Board.findOne({name: req.params.board}, (err, data) => {
        const currentThread = data.threads.filter((thread) => thread._id.toString() === thread_id)[0];
        if (currentThread.delete_password === req.body.delete_password) {
          data.threads = data.threads.filter((thread) => thread._id.toString() !== thread_id);
          data.save((err) => {
            if (err) {
              console.log('Error deleting thread ', err);
            }
            res.send('success');
          });
        } else {
          res.send('incorrect password');
        }
      });
    });
    
  app.route('/api/replies/:board')
    .post((req, res) => {
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const created = new Date();
      const newReply = new Reply({
        text: req.body.text,
        delete_password: req.body.delete_password,
        created_on: created,
        reported: false
      });
      Board.findOne({name: board}, (err, data) => {
        for (let i=0; i < data.threads.length; i++) {
          if (data.threads[i]._id.toString() === thread_id) {
            data.threads[i].replies.push(newReply);
            data.threads[i].bumped_on = created;
            data.save((err) => {
              if (err) {
                console.log('Error posting reply ', err);
              }
            });
          }
        }
        res.redirect('/b/' + board + '/' + thread_id);
      });
    })
  
    .get((req, res) => {
      const thread_id = req.url.split('=')[1];
      Board.findOne({name: req.params.board}, (err, data) => {
        if (err) {
          console.log('Error finding thread ', err);
        }
        const currentThread = data.threads.filter((thread) => thread._id.toString() === thread_id)[0];
        const trimmedThread = { // remove passwords and report booleans
          _id: currentThread._id,
          text: currentThread.text,
          created_on: currentThread.created_on,
          bumped_on: currentThread.bumped_on,
          replies: currentThread.replies.map((reply) => ({
            _id: reply._id,
            text: reply.text,
            created_on: reply.created_on
          }))
        };
        res.send(trimmedThread);
      });
    })
  
    .put((req, res) => {
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      Board.findOne({name: req.params.board}, (err, data) => {
        if (err) {
          console.log('Error finding thread ', err);
        }
        const currentThread = data.threads.filter((thread) => thread._id.toString() === thread_id)[0];
        const currentThreadIndex = data.threads.indexOf(currentThread);
        const currentReply = currentThread.replies.filter((reply) => reply._id.toString() === reply_id)[0];
        const currentReplyIndex = currentThread.replies.indexOf(currentReply);
        currentReply.reported = true;
        currentThread.replies[currentReplyIndex] = currentReply;
        data.threads[currentThreadIndex] = currentThread;
        data.save((err) => {
          if (err) {
            console.log('Error reporting reply ', err);
          }
          res.send('success');
        });
      });
    })
  
    .delete((req, res) => {
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      Board.findOne({name: req.params.board}, (err, data) => {
        if (err) {
          console.log('Error finding thread ', err);
        }
        const currentThread = data.threads.filter((thread) => thread._id.toString() === thread_id)[0];
        const currentThreadIndex = data.threads.indexOf(currentThread);
        const currentReply = currentThread.replies.filter((reply) => reply._id.toString() === reply_id)[0];
        const currentReplyIndex = currentThread.replies.indexOf(currentReply);
        if (currentReply.delete_password === req.body.delete_password) {
          currentReply.text = '[deleted]';
          currentThread.replies[currentReplyIndex] = currentReply;
          data.threads[currentThreadIndex] = currentThread;
          data.save((err, data) => {
            if (err) {
              console.log('Error delting reply ', err);
            }
            res.send('success');
          });
        } else {
          res.send('incorrect password');
        }
      });
    })
};
