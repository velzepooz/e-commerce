import Chance from 'chance';
import { Types } from 'mongoose';

const chance = new Chance.Chance();

export class Faker {
  static appleId(): string {
    return chance.apple_token();
  }

  static city(): string {
    return chance.city();
  }

  static country(): string {
    return chance.country({ full: true });
  }

  static email(
    options: { domain?: string; length?: number } = {
      domain: 'example.com',
      length: 10,
    },
  ): string {
    return chance.email(options);
  }

  static firstName(): string {
    return chance.first();
  }

  static hash(length = 20): string {
    return chance.hash({ length });
  }

  static integer({ min = 0, max = 100 }): number {
    return chance.integer({ min, max });
  }

  static jwt(): string {
    return `Bearer ${chance.string({
      length: 20,
      alpha: true,
      numeric: true,
      symbols: false,
    })}`;
  }

  static lastName(): string {
    return chance.last();
  }

  static mimeType(): string {
    return 'video/mp4';
  }

  static mobilePhone(): string {
    return chance.phone({ formatted: false });
  }

  static mongoId(id?: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  static password(length = 10): string {
    return (
      'a1' +
      chance.string({
        length,
        alpha: true,
        numeric: true,
        symbols: false,
      })
    );
  }

  static pickone(items) {
    return chance.pickone(items);
  }

  static randomDate(): Date {
    return chance.date();
  }

  static state(): string {
    return chance.state({ full: true });
  }

  static string(length = 10): string {
    return chance.string({ length });
  }

  static uid(): string {
    return chance.guid();
  }

  static url(): string {
    return chance.url();
  }
}
