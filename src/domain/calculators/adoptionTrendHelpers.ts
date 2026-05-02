export interface AdoptionTrendEntry {
  date: string;
  newUsers: number;
  returningUsers: number;
  totalActiveUsers: number;
  cumulativeUsers: number;
}

export function computeAdoptionTrendFromUserSets(
  sortedDateUserSets: Array<{ date: string; users: Set<number> }>
): AdoptionTrendEntry[] {
  const seenBefore = new Set<number>();

  return sortedDateUserSets.map(({ date, users }) => {
    let newUsers = 0;
    let returningUsers = 0;

    for (const userId of users) {
      if (seenBefore.has(userId)) {
        returningUsers++;
      } else {
        newUsers++;
        seenBefore.add(userId);
      }
    }

    return {
      date,
      newUsers,
      returningUsers,
      totalActiveUsers: newUsers + returningUsers,
      cumulativeUsers: seenBefore.size,
    };
  });
}
