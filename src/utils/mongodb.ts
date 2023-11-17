import mongoose from 'mongoose';

export default class MongoDB {
  private static instance: MongoDB;
  private constructor() {}

  public static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  public async newConnection(): Promise<void> {
    const connectionString = (process.env.DATABASE ?? '').replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD ?? ''
    );
    try {
      await mongoose.connect(connectionString);
      console.log('Successful database connection!');
    } catch (err) {
      console.error('Database connection error:', err);
      throw err;
    }
  }
}
