import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is not defined in .env.local"
  );
}

const options = {
  serverSelectionTimeoutMS: 10000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient:
    | MongoClient
    | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise:
    | Promise<MongoClient>
    | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(
      uri,
      options
    );
    global._mongoClientPromise =
      global._mongoClient.connect();
  }

  client = global._mongoClient;
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(
    uri,
    options
  );

  clientPromise =
    client.connect();
}

export { client };
export default clientPromise;

export async function getDb() {
  const client =
    await clientPromise;

  return client.db(
    process.env.MONGODB_DB ||
      "stock_attention"
  );
}