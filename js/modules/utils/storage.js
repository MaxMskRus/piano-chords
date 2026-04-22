function getString(key, fallback = '') {
  const value = localStorage.getItem(key);
  return value ?? fallback;
}

function setString(key, value) {
  localStorage.setItem(key, String(value));
}

function getJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export {
  getString,
  setString,
  getJson,
  setJson
};
