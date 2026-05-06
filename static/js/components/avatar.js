/* avatar.js — Avatar component: profile picture or letter badge */

export function buildAvatar(user, size = 32) {
  if (user?.picture) {
    const img = document.createElement('img');
    img.src = user.picture;
    img.alt = user.name || '';
    img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.8);flex-shrink:0;display:block;`;
    return img;
  }
  const div = document.createElement('div');
  div.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:var(--mn-pitch-green);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.4)}px;font-weight:700;color:#fff;flex-shrink:0;user-select:none;`;
  div.textContent = (user?.name || '?')[0].toUpperCase();
  return div;
}
