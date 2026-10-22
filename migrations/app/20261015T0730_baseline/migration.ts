#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ca768c7839d27ee229bea66fa43d6fe3c208f7a3b8d0eb4954b6d4016e2159a9/contract';
import endContract from '../../snapshots/ca768c7839d27ee229bea66fa43d6fe3c208f7a3b8d0eb4954b6d4016e2159a9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ApplicationStatus',
        members: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'Category',
        members: ['NEXT_JS', 'MODERN_JS', 'API', 'WEB', 'CAREER'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ChallengeStatus',
        members: ['IN_PROGRESS', 'CLOSED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'DocumentType',
        members: ['OFFICIAL', 'BLOG', 'BOOK', 'OTHER'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'NotificationType',
        members: [
          'CHALLENGE_APPROVED',
          'CHALLENGE_REJECTED',
          'CHALLENGE_UPDATED',
          'CHALLENGE_DELETED',
          'WORK_ADDED',
          'FEEDBACK_ADDED',
          'FEEDBACK_UPDATED',
          'CHALLENGE_DEADLINE',
          'FEEDBACK_DELETED',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OAuthProvider',
        members: ['GOOGLE'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserGrade',
        members: ['NORMAL', 'EXPERT'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserRole',
        members: ['USER', 'ADMIN'],
      }),
      this.createTable({
        schema: 'public',
        table: 'challenge_applications',
        columns: [
          col('cancelledAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('category', '"Category"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Category' } },
          }),
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('decidedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('decidedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('desiredDeadline', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('documentType', '"DocumentType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'DocumentType' } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('maxParticipants', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"ApplicationStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ApplicationStatus' } },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'challenge_participants',
        columns: [
          col('abandonedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('challengeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinedAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'challenges',
        columns: [
          col('category', '"Category"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Category' } },
          }),
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('deadline', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deleteReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('deletedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('deletedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('documentType', '"DocumentType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'DocumentType' } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('maxParticipants', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceApplicationId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sourceUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"ChallengeStatus"', {
            notNull: true,
            default: lit('IN_PROGRESS'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ChallengeStatus' } },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'drafts',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('participantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'feedbacks',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('workId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'notifications',
        columns: [
          col('actorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('dedupeKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('readAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('relatedChallengeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('relatedWorkId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('type', '"NotificationType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'NotificationType' } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauth_accounts',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', '"OAuthProvider"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OAuthProvider' } },
          }),
          col('providerAccountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('grade', '"UserGrade"', {
            notNull: true,
            default: lit('NORMAL'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserGrade' } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nickname', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"UserRole"', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserRole' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'work_likes',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('workId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'works',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('participantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('submittedAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_applications',
        index: 'challenge_applications_status_createdAt_idx',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_applications',
        index: 'challenge_applications_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_participants',
        index: 'challenge_participants_challengeId_userId_key',
        columns: ['challengeId', 'userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenge_participants',
        index: 'challenge_participants_userId_abandonedAt_idx',
        columns: ['userId', 'abandonedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_category_documentType_idx',
        columns: ['category', 'documentType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_createdById_idx',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'challenges',
        index: 'challenges_status_deadline_idx',
        columns: ['status', 'deadline'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'drafts',
        index: 'drafts_participantId_key',
        columns: ['participantId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'feedbacks',
        index: 'feedbacks_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'feedbacks',
        index: 'feedbacks_workId_createdAt_idx',
        columns: ['workId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_dedupeKey_key',
        columns: ['dedupeKey'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_relatedChallengeId_idx',
        columns: ['relatedChallengeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_userId_readAt_createdAt_idx',
        columns: ['userId', 'readAt', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauth_accounts',
        index: 'oauth_accounts_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauth_accounts',
        index: 'oauth_accounts_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_grade_idx',
        columns: ['grade'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_nickname_key',
        columns: ['nickname'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'work_likes',
        index: 'work_likes_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'work_likes',
        index: 'work_likes_workId_userId_key',
        columns: ['workId', 'userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'works',
        index: 'works_participantId_idx',
        columns: ['participantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'works',
        index: 'works_submittedAt_idx',
        columns: ['submittedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenge_applications',
        foreignKey: {
          name: 'challenge_applications_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenge_applications',
        foreignKey: {
          name: 'challenge_applications_decidedById_fkey',
          columns: ['decidedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenge_participants',
        foreignKey: {
          name: 'challenge_participants_challengeId_fkey',
          columns: ['challengeId'],
          references: { schema: 'public', table: 'challenges', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenge_participants',
        foreignKey: {
          name: 'challenge_participants_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenges',
        foreignKey: {
          name: 'challenges_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenges',
        foreignKey: {
          name: 'challenges_sourceApplicationId_fkey',
          columns: ['sourceApplicationId'],
          references: { schema: 'public', table: 'challenge_applications', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'challenges',
        foreignKey: {
          name: 'challenges_deletedById_fkey',
          columns: ['deletedById'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'drafts',
        foreignKey: {
          name: 'drafts_participantId_fkey',
          columns: ['participantId'],
          references: { schema: 'public', table: 'challenge_participants', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'feedbacks',
        foreignKey: {
          name: 'feedbacks_workId_fkey',
          columns: ['workId'],
          references: { schema: 'public', table: 'works', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'feedbacks',
        foreignKey: {
          name: 'feedbacks_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_relatedChallengeId_fkey',
          columns: ['relatedChallengeId'],
          references: { schema: 'public', table: 'challenges', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_relatedWorkId_fkey',
          columns: ['relatedWorkId'],
          references: { schema: 'public', table: 'works', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauth_accounts',
        foreignKey: {
          name: 'oauth_accounts_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'work_likes',
        foreignKey: {
          name: 'work_likes_workId_fkey',
          columns: ['workId'],
          references: { schema: 'public', table: 'works', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'work_likes',
        foreignKey: {
          name: 'work_likes_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'works',
        foreignKey: {
          name: 'works_participantId_fkey',
          columns: ['participantId'],
          references: { schema: 'public', table: 'challenge_participants', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
