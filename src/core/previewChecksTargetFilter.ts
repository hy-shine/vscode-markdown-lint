import type { PreviewCheck } from '../types';

export type TargetStat = (targetUri: string) => Promise<unknown>;

export async function filterExistingTargetChecks(
  checks: PreviewCheck[],
  statTarget: TargetStat,
): Promise<PreviewCheck[]> {
  const results = await Promise.allSettled(checks.map(async (check) => {
    if (shouldStatTarget(check)) {
      await statTarget(check.targetUri);
      return { check, keep: false };
    }

    return { check, keep: true };
  }));

  return results.flatMap((result, index) => {
    if (result.status === 'rejected') {
      return [checks[index]];
    }

    return result.value.keep ? [result.value.check] : [];
  });
}

function shouldStatTarget(check: PreviewCheck): check is PreviewCheck & { targetUri: string } {
  return (check.type === 'missing-image' || check.type === 'broken-link') && Boolean(check.targetUri);
}
