const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');

const isBluemix = false;

const cloudantMock = require('mock-cloudant');

const expect = chai.expect;
const config = {
  "cloudant": {
    "database": "remember-the-pineapple",
    "url": "https://b33e09bd-c08b-4b6f-a6f3-79f121d38be2-bluemix:0d912b22354de5014c1b3cb33c7371bbfecf60b1aca59562792263eafd7b5988@b33e09bd-c08b-4b6f-a6f3-79f121d38be2-bluemix.cloudant.com"
  }
}

let cloudantMockServer;

const debug = (result) => {
  console.log(JSON.stringify(result, null, 2));
  return result;
}

describe('datastore', () => {
  const datastore = require('./index').main;

  describe('operation::create', () => {
    isBluemix && it('creates a document in the database', () => {
      return datastore({
        config, operation: 'create', doc: {
          foo: 'bar'
        }
      }).then(result => {
        chai.expect(result.statusCode).to.equal(201);
      })
    });

    it('returns an error if no document is passed', () => {
      return datastore({
        config, operation: 'create'
      }).then(result => {
        chai.expect(result.statusCode).to.equal(400);
      })
    });
  });

  describe('operation::read', () => {
    isBluemix && it('reads documents from the database', () => {
      return datastore({
        config,
        operation: 'read',
        selector: {
          foo: 'bar'
        },
        limit: 1
      }).then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result[0].foo).to.equal('bar');
      });
    })

    isBluemix && it('reads a single document if no search parameters are given', () => {
      return datastore({
        config,
        operation: 'create',
        doc: {
          foo: 'bar'
        }
      }).then(doc => {
        return datastore({
          config,
          operation: 'read',
          _id: doc.result._id
        }).then(result => {
          chai.expect(result.statusCode).to.equal(200);
          chai.expect(result.result._id).to.equal(doc.result._id);
        });
      });
    });

    it('returns an error if invalid arguments are passed', () => {
      return datastore({
        config,
        operation: 'read',
        selector: 'foo',
        limit: 'bar',
        sort: [1, 2]
      }).then(result => {
        chai.expect(result.statusCode).to.equal(400);
        return result;
      });
    });

    isBluemix && it('returns a list of all documents if no id is given', () => {
      return datastore({
        config,
        operation: 'read'
      })
        .then(debug)
        .then(result => {
          chai.expect(result.statusCode).to.equal(200);
          return result;
        });
    });
  });

  describe('operations::update', () => {
    isBluemix && it('updates a document in the database', () => {
      return datastore({
        config,
        operation: 'create',
        doc: {
          foo: 'bar'
        }
      }).then(doc => {
        return datastore({
          config,
          operation: 'update',
          doc: {
            _id: doc.result._id,
            foo: 'egon'
          }
        }).then(result => {
          chai.expect(result.statusCode).to.equal(200);
          chai.expect(result.result._id).to.equal(doc.result._id);
          chai.expect(result.result.foo).to.equal('egon');
          return result;
        }).then(result => {
          return datastore({
            config,
            operation: 'update',
            doc: _.assign(result.result, { foo: 'olsen' })
          }).then(result => {
            chai.expect(result.statusCode).to.equal(200);
            chai.expect(result.result._id).to.equal(doc.result._id);
            chai.expect(result.result.foo).to.equal('olsen');
          });
        });
      });
    }).timeout(30000);
  });

  describe('operations::delete', () => {
    isBluemix && it('removes a document from the database', () => {
      return datastore({ config, operation: 'delete' })
        .then(result => {
          chai.expect(result.statusCode).to.equal(200);
        });
    }).timeout(30000);
  });
});