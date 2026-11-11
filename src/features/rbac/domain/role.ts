/**
 * Role platform (`super-admin`) tidak dimiliki desa mana pun dan tidak boleh
 * ditugaskan ke akun yang terikat desa. Dipakai sebagai satu sumber kebenaran
 * oleh gerbang `/super-admin` dan oleh modul Pengguna.
 */
export const PLATFORM_ROLE_SLUG = "super-admin";

export function isPlatformRole(role: { slug: string }): boolean {
  return role.slug === PLATFORM_ROLE_SLUG;
}
