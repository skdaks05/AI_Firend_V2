declare module "react-bits/lib/util/throttle.js" {
  export function throttle<T extends (...args: unknown[]) => void>(
    fn: T,
    ms?: number,
  ): T;

  const _default: {
    throttle?: typeof throttle;
  };

  export default _default;
}
