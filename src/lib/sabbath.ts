export function isSabbath(): boolean {
  if (typeof window === "undefined") return false;
  return new Date().getDay() === 0;
}

export function getSabbathOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("sabbath-override");
  if (v === "on") return true;
  if (v === "off") return false;
  return null;
}

export function setSabbathOverride(value: boolean | null) {
  if (value === null) {
    localStorage.removeItem("sabbath-override");
  } else {
    localStorage.setItem("sabbath-override", value ? "on" : "off");
  }
}

export function computeSabbath(): boolean {
  const override = getSabbathOverride();
  if (override !== null) return override;
  return isSabbath();
}
