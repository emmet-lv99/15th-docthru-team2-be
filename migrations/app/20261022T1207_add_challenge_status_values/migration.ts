#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1a13e7b2ab30eb8f0c32612e43d6a51e90701cf6f7fe14946540136959c6ab4f/contract';
import startContract from '../../snapshots/1a13e7b2ab30eb8f0c32612e43d6a51e90701cf6f7fe14946540136959c6ab4f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc1371e8951f2779975f4bc5af184e0927ab54f2892f3257bb411ae216c24bb0/contract';
import endContract from '../../snapshots/fc1371e8951f2779975f4bc5af184e0927ab54f2892f3257bb411ae216c24bb0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addNativeEnumValue({ schema: 'public', typeName: 'ChallengeStatus', value: 'PENDING' }),
      this.addNativeEnumValue({ schema: 'public', typeName: 'ChallengeStatus', value: 'REJECTED' }),
      this.addNativeEnumValue({
        schema: 'public',
        typeName: 'ChallengeStatus',
        value: 'CANCELLED',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
