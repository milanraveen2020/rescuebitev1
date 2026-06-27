import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Thin wrapper around argon2 so hashing is injectable and easy to stub in tests. */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
