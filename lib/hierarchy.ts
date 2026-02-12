import { User } from "../types/user";

/**
 * Vérifie si targetUser est dans la hiérarchie descendante
 * du currentUser
 */
export function canAssign(
  currentUserId: string,
  targetUserId: string,
  users: User[]
): boolean {
  if (currentUserId === targetUserId) return true;

  const visited = new Set<string>();

  function dfs(managerId: string): boolean {
    const subordinates = users.filter(
      (u) => u.reportsTo === managerId
    );

    for (const sub of subordinates) {
      if (visited.has(sub._id)) continue;
      visited.add(sub._id);

      if (sub._id === targetUserId) return true;

      if (dfs(sub._id)) return true;
    }

    return false;
  }

  return dfs(currentUserId);
}
