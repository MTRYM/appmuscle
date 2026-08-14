const NAV_THEME_COLORS = {
  dark: '#131211',
  light: '#e8dccf',
};

export function applyTheme(theme = 'dark') {
  const resolved = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', NAV_THEME_COLORS[resolved]);
  }
}
