import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Database } from '@offscreen/db';
import {
  approveTerminalPairingLocked,
  countOutstandingPairingsForChallenge,
  countRecentPairingsForIp,
  exchangeTerminalPairingLocked,
  insertTerminalPairing,
  readPairingExchangeSnapshot,
  readTerminalAccessToken,
  readTerminalPairingConsent,
  readUserDisplay,
  revokeTerminalAccessToken,
} from '@offscreen/db/terminal-auth-store';
import type {
  ApproveTerminalPairingRequest,
  CreateTerminalPairingRequest,
  ExchangeTerminalPairingRequest,
  TerminalAccessTokenIssued,
  TerminalPairingCreated,
  TerminalPairingConsent,
  TerminalTokenCurrent,
} from '@offscreen/identity-interface/terminal-auth';
import {
  challengeFromVerifierBase64url,
  digestAccessToken,
  digestPairingCode,
  hmacSourceIpHash,
  mintAccessToken,
  mintPairingCode,
  sha256HexEqual,
} from './crypto.js';
import {
  TERMINAL_AUTH_ORIGIN,
  TERMINAL_PAIRING_HMAC_SECRET,
} from './tokens.js';
import { DATABASE } from '../../database-token.js';

const PAIRING_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IP_WINDOW_MS = 10 * 60 * 1000;
const MAX_PAIRINGS_PER_IP_WINDOW = 5;
const MAX_OUTSTANDING_PER_CHALLENGE = 3;
const POLL_AFTER_SECONDS = 2;

@Injectable()
export class TerminalAuthService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    @Inject(TERMINAL_AUTH_ORIGIN) private readonly origin: string,
    @Inject(TERMINAL_PAIRING_HMAC_SECRET)
    private readonly pairingHmacSecret: string | null,
  ) {}

  private requirePairingHmacSecret(): string {
    if (!this.pairingHmacSecret) {
      throw new ServiceUnavailableException('Terminal pairing unavailable');
    }
    return this.pairingHmacSecret;
  }

  async createPairing(
    sourceIp: string,
    body: CreateTerminalPairingRequest,
  ): Promise<TerminalPairingCreated> {
    const secret = this.requirePairingHmacSecret();
    const sourceIpHash = hmacSourceIpHash(sourceIp, secret);
    const windowStart = new Date(Date.now() - IP_WINDOW_MS);

    const recentCount = await countRecentPairingsForIp(
      this.database,
      sourceIpHash,
      windowStart,
    );
    if (recentCount >= MAX_PAIRINGS_PER_IP_WINDOW) {
      throw new HttpException(
        { code: 'pairing_rate_limited' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const outstandingCount = await countOutstandingPairingsForChallenge(
      this.database,
      body.challengeSha256,
    );
    if (outstandingCount >= MAX_OUTSTANDING_PER_CHALLENGE) {
      throw new HttpException(
        { code: 'challenge_outstanding' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);
    const code = mintPairingCode();
    const pairingId = await insertTerminalPairing(this.database, {
      codeHash: digestPairingCode(code),
      challengeSha256: body.challengeSha256,
      sourceIpHash,
      clientLabel: body.label,
      expiresAt,
    });

    return {
      pairingId,
      code,
      verificationUri: `${this.origin}/terminal/connect?pairingId=${pairingId}`,
      expiry: expiresAt.toISOString(),
      pollAfterSeconds: POLL_AFTER_SECONDS,
    };
  }

  async readPairingConsent(pairingId: string): Promise<TerminalPairingConsent> {
    const snapshot = await readTerminalPairingConsent(
      this.database,
      pairingId,
      new Date(),
    );
    if (!snapshot) {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }
    return {
      pairingId,
      clientLabel: snapshot.clientLabel,
      pairingExpiresAt: snapshot.expiresAt.toISOString(),
      accessDurationDays: 7,
      scope: 'player-story',
    };
  }

  async approvePairing(
    pairingId: string,
    ownerId: string,
    body: ApproveTerminalPairingRequest,
  ): Promise<void> {
    const result = await approveTerminalPairingLocked(
      this.database,
      pairingId,
      ownerId,
      digestPairingCode(body.userCode),
      new Date(),
    );
    if (result === 'expired') {
      throw new GoneException({ code: 'pairing_expired' });
    }
    if (result === 'wrong_code' || result === 'not_found') {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }
  }

  async exchangePairing(
    pairingId: string,
    body: ExchangeTerminalPairingRequest,
  ): Promise<TerminalAccessTokenIssued | null> {
    const challenge = challengeFromVerifierBase64url(body.verifier);
    if (!challenge) {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }

    const snapshot = await readPairingExchangeSnapshot(
      this.database,
      pairingId,
    );
    if (!snapshot || !sha256HexEqual(snapshot.challengeSha256, challenge)) {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }
    if (snapshot.expiresAt.getTime() <= Date.now()) {
      throw new GoneException({ code: 'pairing_expired' });
    }
    if (snapshot.state === 'consumed') {
      throw new ConflictException({ code: 'pairing_consumed' });
    }
    if (snapshot.state === 'pending') {
      return null;
    }
    if (snapshot.state !== 'approved') {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }

    const rawToken = mintAccessToken();
    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    const exchange = await exchangeTerminalPairingLocked(
      this.database,
      pairingId,
      challenge,
      () => rawToken.tokenHash,
      new Date(),
      tokenExpiresAt,
    );

    if (exchange.kind === 'pending') {
      return null;
    }
    if (exchange.kind === 'expired') {
      throw new GoneException({ code: 'pairing_expired' });
    }
    if (exchange.kind === 'consumed') {
      throw new ConflictException({ code: 'pairing_consumed' });
    }
    if (exchange.kind === 'not_found') {
      throw new NotFoundException({ code: 'pairing_not_found' });
    }

    return {
      token: rawToken.token,
      scope: 'player-story',
      expiresAt: exchange.tokenExpiresAt.toISOString(),
    };
  }

  async readCurrentToken(bearerToken: string): Promise<TerminalTokenCurrent> {
    const row = await this.lookupBearerToken(bearerToken);
    const owner = await readUserDisplay(this.database, row.userId);
    if (!owner) {
      throw new UnauthorizedException();
    }
    return {
      userId: owner.id,
      displayName: owner.name,
      scope: 'player-story',
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async revokeCurrentToken(bearerToken: string): Promise<void> {
    const row = await this.lookupBearerToken(bearerToken);
    await revokeTerminalAccessToken(this.database, row.id, new Date());
  }

  private async lookupBearerToken(bearerToken: string) {
    const row = await readTerminalAccessToken(
      this.database,
      digestAccessToken(bearerToken),
      new Date(),
    );
    if (!row) {
      throw new UnauthorizedException();
    }
    return row;
  }
}
