export function clearLocationChrome(): void {
  const { pathname, search, hash } = window.location;
  if (search === "" && hash === "" && (pathname === "/" || pathname === "")) return;
  window.history.replaceState(null, "", "/");
}
