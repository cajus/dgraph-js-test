const dgraph = require("dgraph-js");
const grpc = require("grpc");

// Create a client stub.
function newClientStub() {
    return new dgraph.DgraphClientStub("localhost:9080", grpc.credentials.createInsecure());
}

// Create a client.
function newClient(clientStub) {
    return new dgraph.DgraphClient(clientStub);
}

// Drop All - discard all data and start from a clean slate.
async function dropAll(dgraphClient) {
    const op = new dgraph.Operation();
    op.setDropAll(true);
    await dgraphClient.alter(op);
}

// Set schema.
async function setSchema(dgraphClient) {
    const schema = `
        name: string @index(hash,exact,fulltext) .
        managed: uid @reverse @count .
    `;

    const op = new dgraph.Operation();
    op.setSchema(schema);
    await dgraphClient.alter(op);
}

// Create data using JSON.
async function createData(dgraphClient) {

    let txn = dgraphClient.newTxn();
    let foo, bar;

    try {
        // Create data.
        let p = [
          {
            uid: "_:foo",
            name: "Foo"
          },
          {
            uid: "_:bar",
            name: "Bar"
          }
        ];

        // Run mutation.
        const mu = new dgraph.Mutation();
        mu.setSetJson(p);
        const assigned = await txn.mutate(mu);

        // Commit transaction.
        await txn.commit();

        foo = assigned.getUidsMap().get("foo");
        bar = assigned.getUidsMap().get("bar");
    } finally {
        // Clean up. Calling this after txn.commit() is a no-op
        // and hence safe.
        await txn.discard();
    }

    const txn2 = dgraphClient.newTxn();
    try {
        // Add test managed reference
        let p = {
          "uid": foo,
          "managed": {
            "uid": bar 
          }
        };

        // Run mutation.
        const mu = new dgraph.Mutation();
        mu.setSetJson(p);
        txn2.mutate(mu);

        // Commit transaction.
        await txn2.commit();
    } finally {
        // Clean up. Calling this after txn.commit() is a no-op
        // and hence safe.
        await txn2.discard();
    }
}

// Query for data.
async function queryData(dgraphClient) {
    // Run query.
    const query = `query all($a: string) {
        all(func: eq(name, $a)) {
            uid
            name
            age
            married
            loc
            dob
            friend {
                name
                age
            }
            school {
                name
            }
        }
    }`;
    const vars = { $a: "Alice" };
    const res = await dgraphClient.newTxn().queryWithVars(query, vars);
    const ppl = res.getJson();

    // Print results.
    console.log(`Number of people named "Alice": ${ppl.all.length}`);
    ppl.all.forEach((person) => console.log(person));
}

async function main() {
    const dgraphClientStub = newClientStub();
    const dgraphClient = newClient(dgraphClientStub);
    dgraphClient.setDebugMode(true);
    await dropAll(dgraphClient);
    await setSchema(dgraphClient);
    await createData(dgraphClient);
    //await queryData(dgraphClient);

    // Close the client stub.
    dgraphClientStub.close();
}

main().then(() => {
    console.log("\nDONE!");
}).catch((e) => {
    console.log("ERROR: ", e);
});
