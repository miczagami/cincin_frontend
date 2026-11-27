/**
 * Game and club join codes: 6 letters or digits. Players type, paste or follow a link
 * with one, so every way in is cleaned the same way.
 */
const CODE_LENGTH = 6;

/** A code as a player types or pastes it: uppercased, letters and digits only, at most 6. */
export function cleanJoinCode(raw) {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

/** A code from a link: cleaned the same way, but only a whole code counts ('' otherwise). */
export function joinCodeFromLink(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH ? code : '';
}
