/**
 * Subconjunto de `User` usado pelo AuthService.
 * Permite tipar `user.roles` sem depender da entity completa.
 */
export interface UserWithRoles {
  id: number;
  email: string;
  name: string;
  roles?: { name: string }[];
}
