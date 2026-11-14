import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAFE_CONTROL_ENTRY,
  resolveSafeControlDestination,
  signInHrefForControl,
} from './safe-control-destination';

describe('resolveSafeControlDestination', () => {
  it('allows core control paths', () => {
    expect(resolveSafeControlDestination('/control')).toBe('/control');
    expect(resolveSafeControlDestination('/control/enter')).toBe(
      '/control/enter',
    );
    expect(resolveSafeControlDestination('/control/players')).toBe(
      '/control/players',
    );
  });

  it('allows exact player ref query only', () => {
    expect(resolveSafeControlDestination('/control/players?ref=user_1')).toBe(
      '/control/players?ref=user_1',
    );
  });

  it('rejects open redirects and player paths', () => {
    expect(resolveSafeControlDestination('https://evil.example/')).toBe(
      DEFAULT_SAFE_CONTROL_ENTRY,
    );
    expect(resolveSafeControlDestination('//evil.example')).toBe(
      DEFAULT_SAFE_CONTROL_ENTRY,
    );
    expect(resolveSafeControlDestination('/stories')).toBe(
      DEFAULT_SAFE_CONTROL_ENTRY,
    );
    expect(
      resolveSafeControlDestination('/control/players?ref=../../etc'),
    ).toBe(DEFAULT_SAFE_CONTROL_ENTRY);
  });

  it('builds sign-in href with encoded next', () => {
    expect(signInHrefForControl('/control')).toBe(
      '/sign-in?next=%2Fcontrol',
    );
  });
});
