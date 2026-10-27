import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ChallengeService } from '#services';
import { challengeSchema } from '../src/controllers/challenges/challenges.schema.js';

const makeChallenge = () => ({
  id: 3,
  title: 'Node.js 비동기 프로그래밍',
  category: 'API',
  documentType: 'OFFICIAL',
  sourceUrl: 'https://nodejs.org/docs',
  content: null,
  deadline: '2099-12-31T23:59:59.000Z',
  maxParticipants: 2,
  status: 'IN_PROGRESS',
  participants: [{ id: 1 }, { id: 2 }],
  createdBy: { id: 13, nickname: '유저13', grade: 'EXPERT', role: 'USER' },
  createdAt: '2026-10-27T00:00:00.000Z',
});

test('상세 조회 응답은 목록과 동일한 계약 DTO 및 인원 집계 기준을 사용한다', async () => {
  const challenge = makeChallenge();
  const service = new ChallengeService({
    challengeRepository: {
      listChallenges: async () => ({
        items: [challenge],
        page: 1,
        size: 20,
        totalItems: 1,
      }),
      findChallengeDetailById: async (id) => (id === 3 ? challenge : null),
    },
  });

  const list = await service.listChallenges({ page: 1, size: 20 });
  const detail = await service.getChallengeDetail(3);

  assert.deepEqual(detail, list.items[0]);
  assert.equal(detail.participantCount, 2);
  assert.equal(detail.isFull, true);
  assert.equal(detail.isClosed, false);
  assert.equal(challengeSchema.safeParse(detail).success, true);
});

test('없는 챌린지는 404 NotFoundException을 발생시킨다', async () => {
  const service = new ChallengeService({
    challengeRepository: { findChallengeDetailById: async () => null },
  });

  await assert.rejects(
    service.getChallengeDetail(999),
    (error) => error.status === 404 || error.statusCode === 404,
  );
});

test('관리자 생성 챌린지의 grade는 null이며 마감 상태는 날짜에 의해 계산한다', async () => {
  const challenge = {
    ...makeChallenge(),
    deadline: '2020-01-01T00:00:00.000Z',
    createdBy: { id: 2, nickname: '관리자', grade: 'NORMAL', role: 'ADMIN' },
  };
  const service = new ChallengeService({
    challengeRepository: { findChallengeDetailById: async () => challenge },
  });
  const detail = await service.getChallengeDetail(challenge.id);
  assert.equal(detail.isClosed, true);
  assert.equal(detail.isFull, false);
  assert.equal(detail.createdBy.grade, null);
  assert.equal(challengeSchema.safeParse(detail).success, true);
});
