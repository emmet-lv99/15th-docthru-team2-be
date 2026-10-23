#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e3e143e89d0629e19012b4e2be1112c582c4acbc14fa356b24f3d16c23b8f053/contract';
import endContract from '../../snapshots/e3e143e89d0629e19012b4e2be1112c582c4acbc14fa356b24f3d16c23b8f053/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc1371e8951f2779975f4bc5af184e0927ab54f2892f3257bb411ae216c24bb0/contract';
import startContract from '../../snapshots/fc1371e8951f2779975f4bc5af184e0927ab54f2892f3257bb411ae216c24bb0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'challenges',
        constraint: 'challenges_sourceApplicationId_fkey',
        kind: 'foreignKey',
      }),
      this.dropTable({ schema: 'public', table: 'challenge_applications' }),
      this.dropIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_sourceApplicationId_idx_d900dada',
      }),
      this.dropColumn({ schema: 'public', table: 'challenges', column: 'sourceApplicationId' }),
      this.dropTable({ schema: 'public', table: 'drafts' }),
      this.dropTable({ schema: 'public', table: 'oauth_accounts' }),
      this.dropNativeEnumType({ schema: 'public', typeName: 'ApplicationStatus' }),
      this.addColumn({
        schema: 'public',
        table: 'challenge_participants',
        column: col('draftContent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenge_participants',
        column: col('draftCreatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenge_participants',
        column: col('draftUpdatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenges',
        column: col('cancelledAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenges',
        column: col('decidedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenges',
        column: col('decidedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'challenges',
        column: col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('provider', '"OAuthProvider"', {
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OAuthProvider' } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('providerAccountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'challenges',
        column: col('status', '"ChallengeStatus"', {
          default: lit('PENDING'),
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ChallengeStatus' } },
        }),
        operationClass: 'widening',
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_decidedById_idx_8194d55f',
        columns: ['decidedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_status_createdAt_idx_58610442',
        columns: ['status', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenges',
        foreignKey: {
          name: 'challenges_decidedById_fkey',
          columns: ['decidedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
