import { INestApplication, Injectable } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class TestUtils {
  /**
   * Creates an instance of TestUtils
   */
  constructor(
    @InjectConnection() public connection: Connection,
    private moduleRef: ModuleRef,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('ERROR-TEST-UTILS-ONLY-FOR-TESTS');
    }
  }

  /**
   * Shutdown the http server
   * and close database connections
   */
  async shutdownServer(server: INestApplication) {
    await server.close();
    await this.closeDbConnection();
  }

  /**
   * Closes the database connections
   */
  async closeDbConnection() {
    if ((this.connection.readyState as number) === 1) {
      await this.connection.close();
    }

    await mongoose.disconnect();
  }

  async getCollectionNames() {
    if (!this.connection.db) {
      return [];
    }

    return this.connection.db.collections();
  }

  async dropDatabase() {
    try {
      const collections = await this.getCollectionNames();

      const isDeletable = (collectionName: string) =>
        !collectionName.startsWith('system.') && collectionName !== 'changelog';

      await Promise.all(
        collections
          .filter(({ collectionName }) => isDeletable(collectionName))
          .map((dbCollection) => dbCollection.deleteMany({})),
      );
    } catch (error) {
      throw new Error(`ERROR: Cleaning test db: ${error}`);
    }
  }

  async dropCollection(collectionName: string) {
    if (!this.connection.db) {
      throw new Error('Database not connected');
    }

    try {
      const dbCollection = this.connection.db.collection(collectionName);

      if (!dbCollection) {
        throw new Error(`Collection ${collectionName} does not exist`);
      }

      if (
        collectionName.indexOf('system.') !== -1 ||
        collectionName === 'changelog'
      ) {
        throw new Error(`Collection ${collectionName} cannot be dropped`);
      }

      await dbCollection.deleteMany({});
    } catch (error) {
      throw new Error(`ERROR: Dropping collection: ${error}`);
    }
  }

  async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
