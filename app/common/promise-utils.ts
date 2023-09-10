export const didTimeout = Symbol();

export interface TimeoutOptions {
  timeoutMs: number;
}

/** default timeout options */
const defaultTimeoutOptions: TimeoutOptions = {
  timeoutMs: 30_000,
};

/**
 * Takes a _promise_ and a @see TimeoutOptions to specify the timeout wait and returns
 * a promise that will definitely resolve at or before the specified timeout, with either the the value
 * resolved by the passed in promise, or a the special unique value @see didTimeout
 * @param promise the promise of a result to wait on
 * @param options additional arguments or options (such as the timeout wait)
 * @returns a promise of either the result, or if it timed out, the special value @see didTimeout
 */
export async function timeoutResolve<R>(
  promise: Promise<R>,
  options: TimeoutOptions = defaultTimeoutOptions
): Promise<R | typeof didTimeout> {
  const winner = Promise.race([
    promise,
    new Promise<typeof didTimeout>((resolve) =>
      // we do not clear this timer because the callback does nothing once the race is won
      setTimeout(() => resolve(didTimeout), options.timeoutMs)
    ),
  ]);

  return winner;
}

export class TimedOutErr extends Error implements TimeoutOptions {
  public timeoutMs!: number;
  public constructor(opts: TimeoutOptions) {
    Object.assign(opts);
    super(`Asynchronous operation timed out after ${opts.timeoutMs}ms`);
  }
}

/**
 * Takes a _promise_ and a @see TimeoutOptions to specify the timeout wait and returns
 * a promise that will definitely fulfill at or before the specified timeout, either resolving with the value
 * resolved by the passed in promise, or rejecting with a @see TimedOutErr
 * @param promise the promise of a result to wait on
 * @param options additional arguments or options (such as the timeout wait)
 * @throws {TimedOutErr} if the passed in promise takes longer than the specified timeout argument
 * @returns a promise of either the result
 */
export async function timeoutReject<R>(promise: Promise<R>, options: TimeoutOptions = defaultTimeoutOptions) {
  const winner = await timeoutResolve(promise, options);
  if (winner === didTimeout) throw new TimedOutErr(options);
  else return winner as R;
}

type PromiseResult<T> = T extends Promise<infer U> ? U : never;

/**
 * Gets the first n resolved promises from an array of promises,
 * if a promise rejects before the first n promises are resolved,
 * rejects with the first promise's rejection value
 */
export async function firstNPromises<Promises extends readonly Promise<any>[]>(
  n: number,
  promises: Promises
): Promise<PromiseResult<Promises[number]>[]> {
  type Result = PromiseResult<Promises[number]>;
  if (n <= 0 || n > promises.length) throw RangeError();

  let counter = n;
  let hasResolved = false;
  const results: Result[] = [];

  let resolve: (val: Result[]) => void;
  let reject: (err: any) => void;

  const resultPromise = new Promise<Result[]>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  for (const promise of promises) {
    promise
      .then((result) => {
        if (counter > 0) {
          results.push(result);
          --counter;
        }
        if (counter === 0) {
          hasResolved = true;
          resolve(results);
        }
      })
      .catch((err) => {
        if (!hasResolved) reject(err);
      });
  }

  return resultPromise;
}
