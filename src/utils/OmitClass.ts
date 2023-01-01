const OmitClass = <T, K extends keyof T>(
  Class: new (...args: any[]) => T,
  keys: K[]
): new (...args: any[]) => Omit<T, typeof keys[number]> => Class;
