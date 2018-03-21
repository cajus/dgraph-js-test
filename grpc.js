const grpc = require('grpc');

// load proto
const protos = grpc.load('./api.proto');
const { Dgraph, Request, NQuad, Mutation, Value } = protos.api;

// create new client instance
const dgraph = new Dgraph('localhost:9080', grpc.credentials.createInsecure());

// set mutation
let mutation = new Mutation();
mutation.commit_now = true;

// a string nquad
let nqName = new NQuad();
nqName.subject = '_:foo';
nqName.predicate = 'name';
nqName.object_value = new Value().set('str_val', 'Foo');

// a string nquad
let nq2Name = new NQuad();
nq2Name.subject = '_:bar';
nq2Name.predicate = 'name';
nq2Name.object_value = new Value().set('str_val', 'Bar');

// add all the mutations
mutation.set.push(nqName);
mutation.set.push(nq2Name);

// run set and if successful then run query
//  * rpc Query (Request)            returns (Response) {}
//  * rpc Mutate (Mutation)          returns (Assigned) {}
//  * rpc Alter (Operation)          returns (Payload) {}
//  * rpc CommitOrAbort (TxnContext) returns (TxnContext) {}
//  * rpc CheckVersion(Check)        returns (Version) {}

dgraph.Mutate(mutation, (err, res) => {
  if(err){
    console.error(err);
    return;
  }

  let foo = res.uids['foo'];
  let bar = res.uids['bar'];
  console.log(`created foo as ${foo}`);
  console.log(`created bar as ${bar}`);

  let mutation = new Mutation();
  mutation.commit_now = true;

  // reference
  let nqRef = new NQuad();
  nqRef.subject = foo;
  nqRef.predicate = 'managed';
  nqRef.object_value = new Value().set('uid_val', parseInt(bar, 16));
  mutation.set.push(nqRef);

  dgraph.Mutate(mutation, (err, res) => {
    if(err){
      console.error(err);
      return;
    }

    console.log(res);
  });
});

