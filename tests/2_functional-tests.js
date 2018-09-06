/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);


const newThread = {
  text: 'Test post',
  delete_password: 'test' 
};
let thread_id1, thread_id2, reply_id;

suite('Functional Tests', () => {

  suite('API ROUTING FOR /api/threads/:board', () => {
    
    suite('POST', () => {
      
      test('Make (two) new thread(s so we can delete one and test replies on the other)', (done) => {
        chai.request(server)
          .post('/api/threads/test')
          .send(newThread)
          .end((err, res) => {
            assert.equal(res.status, 200);
            // nothing else to test as there is a res.redirect, no data sent back
        });
        chai.request(server)
          .post('/api/threads/test')
          .send(newThread)
          .end((err, res) => {
            assert.equal(res.status, 200);
            done();
        });
      });
    });
    
    suite('GET', () => {
      test('Test that only 10 posts are returned and each has at most 3 replies', (done) => {
        chai.request(server)
          .get('/api/threads/test')
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isBelow(res.body.length, 11);
            assert.property(res.body[0], '_id');
            assert.property(res.body[0], 'text');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.property(res.body[0], 'replies');
            assert.notProperty(res.body[0], 'delete_password');
            assert.notProperty(res.body[0], 'reported');
            assert.isString(res.body[0]._id);
            assert.isString(res.body[0].text);
            assert.isString(res.body[0].created_on);
            assert.isString(res.body[0].bumped_on);
            assert.isArray(res.body[0].replies);
            assert.isBelow(res.body[0].replies.length, 4);
            thread_id1 = res.body[0]._id; // for use in the DELETE test
            thread_id2 = res.body[1]._id; // for use in the PUT test and testing replies
            done();
          });
      });
    });
    
    suite('DELETE', () => {
      test('Delete a thread with (correct) delete password', (done) => {
        chai.request(server)
          .delete('/api/threads/test')
          .send({ thread_id: thread_id1, delete_password: 'test'})
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
      
      test('Attempt to delete thread with wrong password', (done) => {
        chai.request(server)
          .delete('/api/threads/test')
          .send({ thread_id: thread_id2, delete_password: 'testing'})
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
    });
    
    suite('PUT', () => {
      test('Report a thread', (done) => {
        chai.request(server)
          .put('/api/threads/test')
          .send({ report_id: thread_id2 })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
  });
  
  suite('API ROUTING FOR /api/replies/:board', () => {
    
    const newReply = {
      text: 'Test reply',
      delete_password: 'test',
      thread_id: '' // thread_id2 is not defined here, so there must be some runtime/hoisting/something going on
    };
    
    suite('POST', () => {
      test('Make a reply on the thread with _id thread_id2 created above', (done) => {
        newReply.thread_id = thread_id2; // yep...
        chai.request(server)
          .post('/api/replies/test')
          .send(newReply)
          .end((err, res) => {
            assert.equal(res.status, 200);
            // nothing else to test as we redirect on post, no data returned
            done();
          });
      });
    });
    
    suite('GET', () => {
      test('Retrieve all replies on a single thread', (done) => {
        chai.request(server)
          .get('/api/replies/test')
          .query({thread_id: thread_id2})
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.property(res.body, 'replies');
            assert.notProperty(res.body, 'delete_password');
            assert.notProperty(res.body, 'reported');
            assert.isString(res.body.text);
            assert.isString(res.body.created_on);
            assert.isString(res.body.bumped_on);
            assert.isArray(res.body.replies);
            assert.notProperty(res.body.replies[0], 'delete_password');
            assert.notProperty(res.body.replies[0], 'reported');
            assert.equal(res.body.replies[res.body.replies.length-1].text, newReply.text);
            reply_id = res.body.replies[0]._id; // use for PUT/DELETE tests
            done();
          });
      });
    });
    
    suite('PUT', function() {
      test('report a reply', (done) => {
        chai.request(server)
          .put('/api/replies/test')
          .send({ thread_id: thread_id2, reply_id: reply_id })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
    suite('DELETE', function() {
      test('attempt to delete a reply with the wrong password', (done) => {
        chai.request(server)
          .delete('/api/replies/test')
          .send({ thread_id: thread_id2, reply_id: reply_id, delete_password: 'testing' })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
      
      test('delete a reply with (correct) password', (done) => {
        chai.request(server)
          .delete('/api/replies/test')
          .send({ thread_id: thread_id2, reply_id: reply_id, delete_password: 'test' })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
  });

});
