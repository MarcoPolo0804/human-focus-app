// Avoid visually ambiguous characters (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function roomLinkFor(code) {
  const url = new URL(window.location.href);
  url.search = `?room=${code}`;
  return url.toString();
}
