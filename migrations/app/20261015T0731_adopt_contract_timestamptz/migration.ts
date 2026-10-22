#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1a13e7b2ab30eb8f0c32612e43d6a51e90701cf6f7fe14946540136959c6ab4f/contract';
import endContract from '../../snapshots/1a13e7b2ab30eb8f0c32612e43d6a51e90701cf6f7fe14946540136959c6ab4f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ca768c7839d27ee229bea66fa43d6fe3c208f7a3b8d0eb4954b6d4016e2159a9/contract';
import startContract from '../../snapshots/ca768c7839d27ee229bea66fa43d6fe3c208f7a3b8d0eb4954b6d4016e2159a9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'challenge_participants',
        index: 'challenge_participants_challengeId_userId_key',
      }),
      this.dropIndex({ schema: 'public', table: 'drafts', index: 'drafts_participantId_key' }),
      this.dropIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_dedupeKey_key',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'oauth_accounts',
        index: 'oauth_accounts_provider_providerAccountId_key',
      }),
      this.dropIndex({ schema: 'public', table: 'users', index: 'users_email_key' }),
      this.dropIndex({ schema: 'public', table: 'users', index: 'users_nickname_key' }),
      this.dropIndex({
        schema: 'public',
        table: 'work_likes',
        index: 'work_likes_workId_userId_key',
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_applications',
        column: 'cancelledAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"cancelledAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_applications',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_applications',
        column: 'decidedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"decidedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_applications',
        column: 'desiredDeadline',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"desiredDeadline" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_applications',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_participants',
        column: 'abandonedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"abandonedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_participants',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_participants',
        column: 'joinedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"joinedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenge_participants',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenges',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenges',
        column: 'deadline',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"deadline" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenges',
        column: 'deletedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"deletedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'challenges',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'drafts',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'drafts',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'feedbacks',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'feedbacks',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'notifications',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'notifications',
        column: 'readAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"readAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'oauth_accounts',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'users',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'work_likes',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'works',
        column: 'createdAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"createdAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'works',
        column: 'submittedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"submittedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'works',
        column: 'updatedAt',
        options: {
          qualifiedTargetType: 'timestamptz',
          formatTypeExpected: 'timestamp with time zone',
          rawTargetTypeForLabel: 'timestamptz',
          using: `"updatedAt" AT TIME ZONE 'UTC'`,
        },
      }),
      this.addUnique({
        schema: 'public',
        table: 'challenge_participants',
        constraint: 'challenge_participants_challengeId_userId_key',
        columns: ['challengeId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'drafts',
        constraint: 'drafts_participantId_key',
        columns: ['participantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notifications',
        constraint: 'notifications_dedupeKey_key',
        columns: ['dedupeKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauth_accounts',
        constraint: 'oauth_accounts_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_nickname_key',
        columns: ['nickname'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'work_likes',
        constraint: 'work_likes_workId_userId_key',
        columns: ['workId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_applications',
        index: 'challenge_applications_decidedById_idx_8194d55f',
        columns: ['decidedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_participants',
        index: 'challenge_participants_challengeId_idx_73b8115d',
        columns: ['challengeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_participants',
        index: 'challenge_participants_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_deletedById_idx_6409fd1e',
        columns: ['deletedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_sourceApplicationId_idx_d900dada',
        columns: ['sourceApplicationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'feedbacks',
        index: 'feedbacks_workId_idx_726bc97e',
        columns: ['workId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_relatedWorkId_idx_8701ac35',
        columns: ['relatedWorkId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'work_likes',
        index: 'work_likes_workId_idx_726bc97e',
        columns: ['workId'],
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenge_applications',
        from: 'challenge_applications_status_createdAt_idx',
        to: 'challenge_applications_status_createdAt_idx_58610442',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenge_applications',
        from: 'challenge_applications_userId_idx',
        to: 'challenge_applications_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenge_participants',
        from: 'challenge_participants_userId_abandonedAt_idx',
        to: 'challenge_participants_userId_abandonedAt_idx_16029451',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenges',
        from: 'challenges_category_documentType_idx',
        to: 'challenges_category_documentType_idx_107a77d0',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenges',
        from: 'challenges_createdById_idx',
        to: 'challenges_createdById_idx_8bf640ed',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'challenges',
        from: 'challenges_status_deadline_idx',
        to: 'challenges_status_deadline_idx_7a6712cf',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'feedbacks',
        from: 'feedbacks_userId_idx',
        to: 'feedbacks_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'feedbacks',
        from: 'feedbacks_workId_createdAt_idx',
        to: 'feedbacks_workId_createdAt_idx_638ee4a9',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'notifications',
        from: 'notifications_relatedChallengeId_idx',
        to: 'notifications_relatedChallengeId_idx_a2375290',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'notifications',
        from: 'notifications_userId_readAt_createdAt_idx',
        to: 'notifications_userId_readAt_createdAt_idx_9b6c3810',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'oauth_accounts',
        from: 'oauth_accounts_userId_idx',
        to: 'oauth_accounts_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'users',
        from: 'users_grade_idx',
        to: 'users_grade_idx_26d2b5f2',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'work_likes',
        from: 'work_likes_userId_idx',
        to: 'work_likes_userId_idx_a489d58a',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'works',
        from: 'works_participantId_idx',
        to: 'works_participantId_idx_e6c70ceb',
      }),
      this.renameIndex({
        schema: 'public',
        table: 'works',
        from: 'works_submittedAt_idx',
        to: 'works_submittedAt_idx_2ce3650f',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
