import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';

/**
 * Root module. Feature modules (auth, merchants, surprise-bags, reservations, …)
 * are registered here as they are built, each in its own folder under `src/`.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
  ],
})
export class AppModule {}
