
import { MongoClient } from 'mongodb';
import { config } from './config.js';

let db;

export async function connectDb() {
  const client = new MongoClient(config.mongoUri);

  await client.connect();

  db = client.db(config.dbName);

  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const exists = collections.some(
    collection => collection.name === 'telemetry'
  );

  if (!exists) {
    await db.createCollection('telemetry', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'meta',
        granularity: 'seconds'
      }
    });
  }
